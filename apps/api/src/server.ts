import app from './index';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 API server running at http://localhost:${port}`);
}); 