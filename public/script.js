const btn = document.getElementById("analyzeBtn");
const loading = document.getElementById("loading");
const results = document.getElementById("results");

btn.addEventListener("click", async () => {
  const url = document.getElementById("urlInput").value;

  if (!url) return alert("Enter a URL");

  loading.classList.remove("hidden");
  results.classList.add("hidden");

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: url })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Server error");
    }

    displayResults(data);
    results.classList.remove("hidden");

  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    loading.classList.add("hidden");
  }
});

function displayResults(data) {
  document.getElementById("seoScore").textContent = data.seoScore;

  const techList = document.getElementById("techStack");
  techList.innerHTML = "";
  data.techStack.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    techList.appendChild(li);
  });

  const trackerList = document.getElementById("trackers");
  trackerList.innerHTML = "";
  data.trackers.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    trackerList.appendChild(li);
  });

  document.getElementById("layout").textContent =
    JSON.stringify(data.layout, null, 2);

  document.getElementById("seoDetails").textContent =
    JSON.stringify(data.seo, null, 2);
}
