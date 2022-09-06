require('dotenv').config();
const db = require('./config/dbconn');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const router = express.Router();
const path = require('path');
const cors = require('cors');
const { hash, hashSync, compare, compareSync } = require('bcrypt');

const jwt = require('jsonwebtoken');
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(cors({
  origin: ['http://127.0.0.1:8080 ', 'http://localhost:8080'],
  credentials: true
}));

app.use(
  router,
  express.json(),
  express.urlencoded({
    extended: true
  })
);

app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Sever http://localhost:${PORT} is running`);
});

router.get('/', (req, res) => {
  // res.status(200).json({ msg: 'Home' });
  res.sendFile(path.join(__dirname, 'View', 'index.html'));
});
app.post('/users/register', bodyParser.json(), (req, res) => {
  let { firstName, lastName, email, password } = req.body;
  password = hashSync(password, 20);
  const sqlQry = `INSERT INTO users (firstName, lastName, email, password)
              VALUES ( ?, ?, ?, ?);`;
  db.query(sqlQry, [firstName, lastName, email, password], (err) => {
    if (err) {
      res.json({
        status: 400,
        err: 'Email Exists'
      });
    } else {
      res.json({
        status: 200,
        res: `user with the name: ${firstName} added to the database!`
      });
    }
  });
});
// Compare function
async function comparePassword (password, encrypted, res) {
  await compare(password, encrypted, (err, results) => {
    if (err) {
      throw err;
    }
    const payload = {
      user_id: results[0].user_id,
      firstName: results[0].firstName,
      lastName: results[0].lastName,
      email: results[0].email,
      password: results[0].password
    };
    jwt.sign(payload, process.env.jwtsecret, {
      expiresIn: '7d'
    }, (err, token) => {
      if (err) throw err;
      res.status(200).json({
        msg: 'You are logged in',
        token,
        results: results[0]
      });
    });
  });
}
// Login users
// ---------------------------------------------------------------------------------------
router.post('/users/login', bodyParser.json(), (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT * FROM users WHERE email = '${email}';`;
  console.log(req.body);
  db.query(sql, async (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      res.send('No email found');
    } else {
      console.log('Still on');
      console.log('Running');
      comparePassword(password, results[0].password);
      console.log('Hello');
      await compare(password, results[0].password, (cErr, cResults) => {
        if (cErr) throw cErr;
        const payload = {
          user: {
            user_id: results[0].user_id,
            firstName: results[0].firstName,
            lastName: results[0].lastName,
            email: results[0].email,
            password: results[0].password
          }
        };
        if (cResults) {
          jwt.sign(payload, process.env.jwtsecret, {
            expiresIn: '1d'
          }, (err, token) => {
            if (err) throw err;
            res.status(200).json({
              msg: 'Logged in',
              token,
              results: results[0]
            });
          });
        }
      });
      console.log('working');
      const isMatch = compareSync(password, results[0].password);
      console.log(isMatch);
      // const isMatch = await compare(req.body.password, results[0].password);
      if (!isMatch) {
        res.send('Password is Incorrect');
      } else {
        const payload = {
          user: {
            user_id: results[0].user_id,
            firstName: results[0].firstName,
            lastName: results[0].lastName,
            email: results[0].email,
            password: results[0].password
          }
        };
        jwt.sign(payload, `${process.env.JWT_SECRET_KEY}`, {
          expiresIn: '1h'
        }, (err, token) => {
          if (err) throw err;
          res.status(200).json({
            msg: 'Logged in',
            token,
            results: results[0]
          });
        });
      }
    }
  });
});

// Specific users
router.get('/users/:user_id', (req, res) => {
  // Query
  const strQry =
      `
  SELECT user_id, firstName, lastName, email, password
  FROM users
  WHERE user_id = ?;
  `;
  db.query(strQry, [req.params.user_id], (err, results) => {
    if (err) throw err;
    res.json({
      status: 200,
      results: (results.length <= 0) ? 'Sorry, no user was found.' : results
    });
  });
});

// get all users
router.get('/users', (req, res) => {
  const strQry =
`  SELECT user_id, firstName , lastName, email FROM users ;
  `;
  db.query(strQry, (err, results) => {
    if (err) throw err;
    res.json({
      status: 200,
      results: results
    });
  });
});

// update Or edit user
router.put('/users/:user_id', bodyParser.json(), (req, res) => {
  const bd = req.body;
  bd.password = hash.hashSync(bd.password, 10);
  // Query
  const strQry =
      `UPDATE users
   SET firstName = ?, lastName = ?, email = ?, password = ?
   WHERE user_id = ${req.params.user_id}`;
  db.query(strQry, [bd.firstName, bd.lastName, bd.email, bd.password], (err, data) => {
    if (err) throw err;
    res.send(`number of affected record/s: ${data.affectedRows}`);
  });
});

// Delete a specific user
router.delete('/users/:user_id', (req, res) => {
  // Query
  const strQry = `
  DELETE FROM users
  WHERE user_id = ?;
  `;
  db.query(strQry, [req.params.user_id], (err, data, fields) => {
    if (err) throw err;
    res.send(`${data.affectedRows} row was affected`);
  });
});

// create products

router.post('/products', bodyParser.json(),
  (req, res) => {
    try {
      const bd = req.body;
      // bd.totalamount = bd.quantity * bd.price;
      // Query
      const strQry =
                `
        INSERT INTO products(title, book_description, img, BookCategory)
        VALUES(?, ?, ?, ?);
        `;
        //
      db.query(strQry,
        [bd.title, bd.book_description, bd.img, bd.BookCategory],
        (err, results) => {
          if (err) throw err;
          res.send(`number of affected row/s: ${results.affectedRows}`);
        });
    } catch (e) {
      console.log(`Create a new product: ${e.message}`);
    }
  });

// get products
router.get('/products', (req, res) => {
  // Query
  const strQry =
    `
  SELECT book_id, title, book_description, img, BookCategory FROM products;
  `;
  db.query(strQry, (err, results) => {
    if (err) throw err;
    res.json({
      status: 200,
      results: results
    });
    console.log(err);
  });
});

// get specific
router.get('/products/:book_id', (req, res) => {
  // Query
  const strQry =
      `
  SELECT book_id, title, book_description, img, BookCategory
  FROM products
  WHERE book_id = ?;
  `;
  db.query(strQry, [req.params.book_id], (err, results) => {
    if (err) throw err;
    res.json({
      status: 200,
      results: (results.length <= 0) ? 'Sorry, no product was found.' : results
    });
  });
});
// Update product
router.put('/products', (req, res) => {
  const bd = req.body;
  // Query
  const strQry =
  `UPDATE products
  SET ?
  WHERE id = ?`;

  db.query(strQry, [bd.id], (err, data) => {
    if (err) throw err;
    res.send(`number of affected record/s: ${data.affectedRows}`);
  });
});

// Delete product
router.delete('/clinic/:id', (req, res) => {
  // Query
  const strQry =
  `
  DELETE FROM products
  WHERE id = ?;
  `;
  db.query(strQry, [req.params.id], (err, data, fields) => {
    if (err) throw err;
    res.send(`${data.affectedRows} row was affected`);
  });
});

// favourites

// Get specific user's favourites
app.get('/users/:user_id/favourites', (req, res) => {
  const sql = `SELECT favourites FROM users WHERE user_id = ${req.params.user_id}`;
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json({
      status: 200,
      results: JSON.parse(results[0].favourite)
    });
  });
});

// Add items to the user's specific favourites
router.post('/users/:id/favourites', bodyParser.json(), (req, res) => {
  const bd = req.body;
  const sql = `SELECT favourites FROM users WHERE user_id = ${req.params.id}`;
  db.query(sql, (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      let favourites;
      if (results[0].favourites == null) {
        favourites = [];
      } else {
        favourites = JSON.parse(results[0].favourites);
      }
      const product = {
        book_id: favourites.length + 1,
        title: bd.title,
        BookCategory: bd.BookCategory,
        book_description: bd.book_description,
        img: bd.img
      };
      favourites.push(product);
      const sql1 = `UPDATE users SET favourites = ? WHERE user_id = ${req.params.id}`;
      db.query(sql1, JSON.stringify(favourites), (err, results) => {
        if (err) throw results;
        res.send('Product added to your favourites');
      });
    }
  });
});

// Delete items from the specific user's favourites
app.delete('/users/:user_id/favourites', bodyParser.json(), (req, res) => {
  const bd = req.body;
  const sql = `UPDATE users SET favourites = null WHERE user_id = ${req.params.id + bd}`;
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.send('favourites is empty');
  });
});
