document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
  
    const imageInput = document.getElementById('itemImage');
    const priceInput = document.getElementById('itemPrice');
    const itemList = document.getElementById('itemList');
  
    const file = imageInput.files[0];
    const price = priceInput.value;
  
    if (!file || !price) return;
  
    const reader = new FileReader();
    reader.onload = function(e) {
      const itemCard = document.createElement('div');
      itemCard.className = 'item';
  
      itemCard.innerHTML = `
        <img src="${e.target.result}" alt="Item image" />
        <p>Price: $${price}</p>
      `;
  
      itemList.appendChild(itemCard);
  
      imageInput.value = '';
      priceInput.value = '';
    };
    reader.readAsDataURL(file);
  });
  