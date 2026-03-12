import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <ul>
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/content">Content</Link>
        </li>
        <li>
          <Link href="/payment">Payment</Link>
        </li>
      </ul>
    </nav>
  );
}
