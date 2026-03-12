import NewsStoriesView from "../components/NewsStoriesView";

export default function NewsPage() {
  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">News desk</span>
        <h1 className="heading">California news stories</h1>
        <p className="section-intro">
          Add and manage stories for statewide, regional, and campaign-specific
          coverage from one editor page.
        </p>
      </div>

      <NewsStoriesView />
    </section>
  );
}
