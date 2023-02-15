const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "book-matching.db");

let database = null;

const initializeDatabaseAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running at http://localhost:3001/");
    });
  } catch (error) {
    console.log(`Error opening database: ${error}`);
    process.exit(1);
  }
};

initializeDatabaseAndServer();

app.post("/api/submitStudentData", async (request, response) => {
  const { name, mathScore, scienceScore, historyScore } = request.body;
  const insertDataQuery = `
    INSERT INTO students (name, math_score, science_score, history_score)
    VALUES ('${name}', ${mathScore}, ${scienceScore}, ${historyScore})
  `;
  try {
    const dbResponse = await database.run(insertDataQuery);
    response.status(200).send({ message: "Student Data saved successfully" });
  } catch (e) {
    response.status(500).send({ message: e.message });
  }
});

app.post("/api/submitBookData", async (request, response) => {
  const {
    name,
    type,
    author,
    typeScore,
    nameScore,
    authorScore,
  } = request.body;
  const insertDataQuery = `
    INSERT INTO books (name, type, author, type_score, name_score, author_score)
    VALUES ('${name}', '${type}', '${author}', ${typeScore}, ${nameScore}, ${authorScore})
  `;
  try {
    const dbResponse = await database.run(insertDataQuery);
    response.status(200).send({ message: "Book Data saved successfully" });
  } catch (e) {
    response.status(500).send({ message: e.message });
  }
});

app.post("/api/match", async (request, response) => {
  const {
    mathScore,
    scienceScore,
    historyScore,
    bookType,
    bookName,
    bookAuthor,
  } = request.body;

  const getBooksQuery = `
    SELECT * FROM books
    WHERE type = '${bookType}' AND name = '${bookName}' AND author = '${bookAuthor}'
  `;

  const getUsersQuery = `
    SELECT * FROM users
    WHERE math_score = ${mathScore} AND science_score = ${scienceScore} AND history_score = ${historyScore}
  `;

  try {
    const [book] = await database.all(getBooksQuery);
    const [user] = await database.all(getUsersQuery);

    const bookScoreVector = [
      book.type_score,
      book.name_score,
      book.author_score,
    ];
    const userScoreVector = [
      user.math_score,
      user.science_score,
      user.history_score,
    ];

    const differenceOfVectors = bookScoreVector.map((bookScore, index) =>
      Math.abs(bookScore - userScoreVector[index])
    );
    const matchScore = differenceOfVectors.reduce(
      (total, value) => total + value,
      0
    );

    response.status(200).send({ book, matchScore });
  } catch (error) {
    console.log(`Error retrieving data from database: ${error}`);
    response.status(500).send({ message: "Internal server error" });
  }
});

module.exports = app;
