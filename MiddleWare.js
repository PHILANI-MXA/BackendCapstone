require('dotenv');
const express = require('express');

const app = express();

const router = express.Router();
const port = parseInt(process.env.PORT) || 3000;

app.use(router);
app.listen(port, () => {
  console.log('serve is running on port');
});
