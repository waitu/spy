import { Link } from 'react-router-dom';
import { PageMasthead } from '../components/HeroSection';
import { useApiResource } from '../lib/useApiResource';
import { PinterestAdminTab } from './PinterestAdminTab';

function DashboardState({ title, description }) {
  return (
    <section className="site-width page-state story-surface">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </section>
  );
}

export function PinterestDashboardPage() {
  const { data, loading, error, refetch } = useApiResource('/api/admin/dashboard', []);
  const stories = data?.stories ?? [];

  if (loading) {
    return <DashboardState title="Loading Pinterest dashboard..." />;
  }

  if (error) {
    return <DashboardState title="Unable to load Pinterest dashboard" description={error.message} />;
  }

  return (
    <>
      <PageMasthead
        eyebrow="Admin"
        title="Pinterest dashboard"
        description="A dedicated planning and publishing workspace built for finding stories fast, tracking coverage, and pushing pins live without digging through the content studio."
      />

      <section className="site-width admin-toolbar">
        <div className="admin-toolbar__main">
          <div className="admin-panel__actions">
            <Link className="button-secondary" to="/admin" style={{ textDecoration: 'none' }}>
              Back to content studio
            </Link>
            <button type="button" className="button-secondary" onClick={refetch}>
              Refresh stories
            </button>
          </div>
        </div>
        <div className="admin-toolbar__meta">
          <div className="admin-summary-card story-surface">
            <strong>{stories.length}</strong>
            <span>stories available for Pinterest planning</span>
          </div>
        </div>
      </section>

      <PinterestAdminTab stories={stories} />
    </>
  );
}