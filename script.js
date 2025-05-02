/*let wavesurfer;

function toSeconds(mmss) {
    const [m, s] = mmss.split(":").map(Number);
    return m * 60 + s;
}

document.getElementById("uploadBtn").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (wavesurfer) wavesurfer.destroy();

    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'gray',
        progressColor: 'blue',
        height: 100,
        plugins: [
            WaveSurfer.regions.create()
        ]
    });

    wavesurfer.load(URL.createObjectURL(file));

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "🔄 Analyzing audio...";

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("http://localhost:5000/analyze", {
            method: "POST",
            body: formData
        });

        const result = await res.json();
        resultDiv.innerHTML = `<p><strong>${result.num_events} events detected</strong></p>`;

        result.detected_events.forEach((event) => {
            const start = toSeconds(event.start_time);
            const end = toSeconds(event.end_time);

            wavesurfer.addRegion({
                start,
                end,
                color: 'rgba(255, 0, 0, 0.3)',
            });

            const label = document.createElement("div");
            label.innerText = `${event.start_time} - ${event.end_time} (Loudness: ${event.intensity})`;

            const button = document.createElement("button");
            button.innerText = `▶ Play ${event.start_time} - ${event.end_time}`;
            button.onclick = () => wavesurfer.play(start, end);

            resultDiv.appendChild(label);
            resultDiv.appendChild(button);
        });

    } catch (err) {
        console.error("Error:", err);
        resultDiv.innerText = "❌ Error analyzing audio.";
    }
});
*/

let wavesurfer;

function toMMSS(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

document.getElementById("uploadBtn").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset waveform
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

    // Step 1: Decode audio and extract raw data
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const data = audioBuffer.getChannelData(0); // mono

    // Step 2: Process in 512-sample frames (like librosa RMS)
    const frameSize = 512;
    const sampleRate = audioBuffer.sampleRate;
    const threshold = 0.06; // tweak this for sensitivity

    const events = [];
    for (let i = 0; i < data.length; i += frameSize) {
        const slice = data.slice(i, i + frameSize);
        const energy = Math.sqrt(slice.reduce((sum, val) => sum + val * val, 0) / slice.length);

        const time = i / sampleRate;

        if (energy > threshold) {
            const start = Math.max(0, time - 0.25);
            const end = time + 0.25;

            // Avoid duplicates
            if (!events.length || start - events[events.length - 1].end > 1) {
                events.push({ start, end, energy });
            }
        }
    }

    if (events.length === 0) {
        resultDiv.innerHTML = "✅ No loud sounds (crying/screaming) detected.";
        return;
    }

    resultDiv.innerHTML = `<strong>${events.length} loud event(s) detected:</strong><br>`;

    events.forEach((evt, idx) => {
        wavesurfer.addRegion({
            start: evt.start,
            end: evt.end,
            color: 'rgba(255, 0, 0, 0.4)'
        });

        const text = document.createElement("div");
        text.textContent = `${toMMSS(evt.start)} - ${toMMSS(evt.end)} (volume: ${evt.energy.toFixed(3)})`;

        const btn = document.createElement("button");
        btn.textContent = `▶ Play ${toMMSS(evt.start)} - ${toMMSS(evt.end)}`;
        btn.onclick = () => wavesurfer.play(evt.start, evt.end);

        resultDiv.appendChild(text);
        resultDiv.appendChild(btn);
    });
});
