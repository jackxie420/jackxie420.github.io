let quotes = [];
fetch("quotes.json")
  .then(res => res.json())
  .then(data => {
    quotes = data;
    newQuote();
  });

function newQuote() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById("quote").innerText = quote;
  document.body.style.backgroundImage = `url(https://source.unsplash.com/random/1600x900/?inspiration,nature)`;
}

document.getElementById("toggle-mode").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
