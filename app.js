import express from 'express';
import nunjucks from 'nunjucks';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- GOV.UK assets ---
const govukFrontendPath = path.dirname(require.resolve('govuk-frontend/package.json'));
// Serve fonts, images, and other assets from the assets directory
app.use('/assets', express.static(path.join(govukFrontendPath, 'dist', 'govuk', 'assets')));
// Serve CSS and JS files from the root govuk directory
app.use('/assets', express.static(path.join(govukFrontendPath, 'dist', 'govuk')));

// Your static (optional)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Parse POST bodies
app.use(express.urlencoded({ extended: false }));

// --- Nunjucks ---
nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app
});
app.set('view engine', 'njk');

// --- In-memory "DB" (simple for the exercise) ---
const submissions = []; // [{ id, preference, email?, phone?, at }]
let nextId = 1;

// --- Routes ---
app.get('/', (req, res) => {
  res.render('index', { errors: {}, values: {} });
});

app.post('/submit', (req, res) => {
  const { contact_preference, email, phone } = req.body;
  const errors = {};
  const values = { contact_preference, email, phone };

  // Validate preference
  if (!contact_preference) {
    errors.contact_preference = 'Select a contact preference';
  }

  // Conditional validation
  if (contact_preference === 'email') {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address';
    }
  } else if (contact_preference === 'phone') {
    if (!phone || !/^[0-9 +()\-]{7,}$/.test(phone)) {
      errors.phone = 'Enter a valid phone number';
    }
  }

  if (Object.keys(errors).length) {
    return res.status(400).render('index', { errors, values });
  }

  // Store
  const record = {
    id: nextId++,
    preference: contact_preference,
    email: contact_preference === 'email' ? email : null,
    phone: contact_preference === 'phone' ? phone : null,
    at: new Date().toISOString()
  };
  submissions.push(record);

  // Confirm
  res.redirect(`/success?id=${record.id}`);
});

app.get('/success', (req, res) => {
  const id = Number(req.query.id);
  const record = submissions.find(r => r.id === id);
  if (!record) return res.redirect('/');
  res.render('success', { record });
});

// (Optional) quick admin listing for panel discussion
app.get('/admin/submissions', (req, res) => {
  res.json(submissions);
});

// --- Start server ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
