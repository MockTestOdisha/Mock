const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const dbFile = path.join(__dirname, 'exam.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initDatabase();
  }
});

// Create Tables
function initDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'CANDIDATE',
      subscription_expires_at DATETIME
    )`);

    // Tests table (Allows multiple mock tests under one URL)
    db.run(`CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 60,
      total_marks INTEGER DEFAULT 100
    )`);

    // Questions table
    db.run(`CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      FOREIGN KEY(test_id) REFERENCES tests(id)
    )`);

    // Submissions table (Tracks attempts, scores, and daily limits)
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      test_id INTEGER,
      score INTEGER,
      correct INTEGER,
      incorrect INTEGER,
      time_seconds INTEGER,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(test_id) REFERENCES tests(id)
    )`);

    // Insert sample test and questions if empty
    db.get(`SELECT COUNT(*) as count FROM tests`, (err, row) => {
      if (row.count === 0) {
        seedInitialData();
      }
    });
  });
}

function seedInitialData() {
  db.run(`INSERT INTO tests (title, description, duration_minutes, total_marks) VALUES 
    ('Odia Grammar Mock Test 01', 'Test your knowledge of Odia Sandhi, Samasa, and Grammar rules.', 30, 50)`, 
    function(err) {
      if (!err) {
        const testId = this.lastID;
        db.run(`INSERT INTO questions (test_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES 
          ('Odia Grammar Mock Test 01' , 'Which of the following is correct Odia Sandhi for Ut + Chhedan?', 'Utchhedan', 'Ucchhedan', 'Uchhedan', 'Utchedan', 'B', 'Ut + Chhedan becomes Ucchhedan due to rules of व्यंजन संधि.'),
          ('Odia Grammar Mock Test 01', 'What is the meaning of "ଅକପଟ"?', 'Dishonest', 'Cruel', 'Frank / Honest', 'Lazy', 'C', 'ଅକପଟ means straightforward, honest, or free from deceit.')`);
      }
    }
  );
}

// API: Get all available mock tests
app.get('/api/tests', (req, res) => {
  db.all(`SELECT * FROM tests`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// API: Get questions for a specific mock test
app.get('/api/tests/:id/questions', (req, res) => {
  const testId = req.params.id;
  db.all(`SELECT id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE test_id = ?`, [testId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
