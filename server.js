const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();

const PORT = 3000;

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

let items = [];

app.get('/', (req, res) => {
  res.render('index', { items });
});

app.post('/upload', upload.single('itemImage'), (req, res) => {
  const price = req.body.price;
  const imagePath = '/uploads/' + req.file.filename;

  items.push({ price, imagePath });
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
