let wavesurfer;
let mediaRecorder;

function toMMSS(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

document.getElementById("uploadBtn").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        processAudioFile(file);
    }
});

document.getElementById("recordBtn").addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        processAudioFile(blob);
    };
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 7000); // record 7 seconds
});

async function processAudioFile(file) {
    if (wavesurfer) wavesurfer.destroy();

    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'gray',
        progressColor: 'blue',
        height: 100,
        plugins: [ WaveSurfer.regions.create() ]
    });

    wavesurfer.load(URL.createObjectURL(file));

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "🔍 Processing...";

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const data = audioBuffer.getChannelData(0);

    const frameSize = 512;
    const sampleRate = audioBuffer.sampleRate;
    const threshold = 0.1; 
    const minDurationSec = 5;
    const minFrames = Math.floor((minDurationSec * sampleRate) / frameSize);

    const events = [];
    let currentStart = null;
    let frameCount = 0;

    for (let i = 0; i < data.length; i += frameSize) {
        const slice = data.slice(i, i + frameSize);
        const energy = Math.sqrt(slice.reduce((sum, val) => sum + val * val, 0) / slice.length);
        const time = i / sampleRate;

        if (energy > threshold) {
            if (currentStart === null) {
                currentStart = time;
                frameCount = 1;
            } else {
                frameCount++;
            }
        } else {
            if (currentStart !== null && frameCount >= minFrames) {
                const end = time;
                events.push({ start: currentStart, end, energy });
            }
            currentStart = null;
            frameCount = 0;
        }
    }

    // Handle case where audio ends during a loud event
    if (currentStart !== null && frameCount >= minFrames) {
        const end = data.length / sampleRate;
        events.push({ start: currentStart, end, energy: 1.0 });
    }

    // Results
    if (events.length === 0) {
        resultDiv.innerHTML = "✅ No loud sounds longer than 5 seconds detected.";
        return;
    }

    resultDiv.innerHTML = `<strong>${events.length} loud event(s) detected:</strong><br>`;
    events.forEach((evt) => {
        wavesurfer.addRegion({
            start: evt.start,
            end: evt.end,
            color: 'rgba(255, 0, 0, 0.4)'
        });

        const text = document.createElement("div");
        text.textContent = `${toMMSS(evt.start)} - ${toMMSS(evt.end)} (duration: ${(evt.end - evt.start).toFixed(2)}s)`;

        const btn = document.createElement("button");
        btn.className = "play-btn";
        btn.textContent = `▶ Play ${toMMSS(evt.start)} - ${toMMSS(evt.end)}`;
        btn.onclick = () => wavesurfer.play(evt.start, evt.end);

        resultDiv.appendChild(text);
        resultDiv.appendChild(btn);
    });
}
