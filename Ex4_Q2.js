const express = require('express');
const app = express();
const PORT = 3000;
 
app.use(express.json());
 
let cards = [
  { id: 1, suit: 'Hearts', value: 'Ace' },
  { id: 2, suit: 'Spades', value: 'King' },
  { id: 3, suit: 'Diamonds', value: 'Queen' }
];
 
app.get('/', (req, res) => {
  res.json({ message: "Welcome to the Playing Card Collection API" });
});
 
app.get('/cards', (req, res) => {
  res.json(cards);
});
 
app.get('/cards/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const card = cards.find(c => c.id === id);

  if (!card) {
    return res.status(404).json({ message: "Card not found" });
  }
  res.json(card);
});
 
app.post('/cards', (req, res) => {
  const { suit, value } = req.body;

  if (!suit || !value) {
    return res.status(400).json({ message: "Suit and value are required" });
  }

  const newCard = {
    id: cards.length > 0 ? cards[cards.length - 1].id + 1 : 1,
    suit,
    value
  };

  cards.push(newCard);
  res.status(201).json({ message: "Card added successfully", card: newCard });
});
 
app.delete('/cards/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const cardIndex = cards.findIndex(c => c.id === id);

  if (cardIndex === -1) {
    return res.status(404).json({ message: "Card not found" });
  }

  const removedCard = cards.splice(cardIndex, 1);
  res.json({ message: "Card deleted successfully", card: removedCard[0] });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
