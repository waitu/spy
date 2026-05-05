import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext';

export function NewsletterCard({ compact = false }) {
  return (
    <section className={compact ? 'sidebar-panel newsletter-panel compact' : 'sidebar-panel newsletter-panel'} id="newsletter">
      <span className="eyebrow">Make Your Inbox Your Happy Place</span>
      <h3>Get freebies, inspo, &amp; more delivered to you.</h3>
      <form className="newsletter-form">
        <input type="email" placeholder="Email address" aria-label="Email address" />
        <button type="submit">I&apos;M IN!</button>
      </form>
    </section>
  );
}

export function SidebarBox({ title, children, id }) {
  return (
    <section className="sidebar-panel" id={id}>
      <span className="eyebrow">{title}</span>
      {children}
    </section>
  );
}

export function TopicCloud() {
  const { topics } = useSite();

  return (
    <section className="sidebar-panel topics-panel">
      <span className="eyebrow">Trending Topics</span>
      <div className="topic-cloud">
        {topics.map((topic) => (
          <Link key={topic.path} to={topic.path}>
            {topic.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
