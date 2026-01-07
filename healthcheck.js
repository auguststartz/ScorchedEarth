// Health check script for Docker

const PORT = process.env.PORT || 3000;

try {
  const response = await fetch(`http://localhost:${PORT}/health`);
  const data = await response.json();

  if (data.status === 'healthy') {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error('Health check failed: unhealthy status');
    process.exit(1);
  }
} catch (error) {
  console.error('Health check failed:', error.message);
  process.exit(1);
}
