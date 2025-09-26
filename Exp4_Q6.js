const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// MongoDB connection
mongoose
  .connect("mongodb://127.0.0.1:27017/bankDB", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

// Account schema
const accountSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  balance: { type: Number, required: true, default: 0 }
});

const Account = mongoose.model("Account", accountSchema);

// Create sample accounts (optional, for testing)
app.post("/create", async (req, res) => {
  try {
    const { username, balance } = req.body;
    const acc = new Account({ username, balance });
    await acc.save();
    res.json({ message: "Account created", account: acc });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Transfer endpoint
app.post("/transfer", async (req, res) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const sender = await Account.findOne({ username: from });
    const receiver = await Account.findOne({ username: to });

    if (!sender) return res.status(404).json({ error: "Sender account not found" });
    if (!receiver) return res.status(404).json({ error: "Receiver account not found" });

    if (sender.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Sequential updates (no transactions)
    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    res.json({
      message: `Transferred ${amount} from ${from} to ${to}`,
      senderBalance: sender.balance,
      receiverBalance: receiver.balance
    });
  } catch (err) {
    res.status(500).json({ error: "Transfer failed", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("Transfer API running on http://localhost:3000");
});
