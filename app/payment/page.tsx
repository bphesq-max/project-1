export default function PaymentPage() {
  return (
    <main>
      <h1>Promotion Packages</h1>
      <ol>
        <li>Basic Package - $100 (listing on homepage)</li>
        <li>Standard Package - $250 (homepage + featured slot)</li>
        <li>Premium Package - $500 (full banner + social shoutout)</li>
      </ol>
      <h2>Request Promotion</h2>
      <form>
        <div>
          <label htmlFor="name">Name:</label>
          <input type="text" id="name" name="name" />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" name="email" />
        </div>
        <div>
          <label htmlFor="package">Select Package:</label>
          <select id="package" name="package">
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <button type="submit">Submit Request</button>
      </form>
      <p>
        (This is a static demonstration. No payments or database are used yet.)
      </p>
    </main>
  );
}
