export default function Footer() {
  return (
    <div className="footer">
      <span>
        <button className="footer-link">Terms</button>
        {' · '}
        <button className="footer-link">Policy</button>
        {' · '}
        <button className="footer-link">About</button>
        {' · '}
        <span style={{ padding: '2px 6px' }}>A Lycoris Product</span>
      </span>
    </div>
  );
}
