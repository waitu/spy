import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toStoryImageBackground } from '../lib/content';

export function FeatureRow({ stories }) {
  return (
    <div className="feature-grid">
      {stories.map((story) => (
        <Link key={story.id} className="feature-card story-surface" to={story.path ?? '/'}>
          <div className="feature-card__visual" style={{ '--story-image': toStoryImageBackground(story.image) }} />
          <div className="feature-card__body">
            <span className="eyebrow">{story.category}</span>
            <h3>{story.title}</h3>
            <div className="meta-row">
              <span>By {story.author}</span>
              <span>{story.date}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function RecentList({ stories }) {
  return (
    <div className="recent-list">
      {stories.map((story) => (
        <article key={story.id} className="recent-card">
          <div className="recent-card__visual" style={{ '--story-image': toStoryImageBackground(story.image) }} />
          <div className="recent-card__body story-surface">
            <span className="eyebrow">{story.category}</span>
            <h3>{story.title}</h3>
            <div className="meta-row">
              <span>By {story.author}</span>
              <span>{story.date}</span>
            </div>
            <p>{story.excerpt}</p>
            <Link className="section-link" to={story.path ?? '/'}>
              Continue reading <ArrowRight size={16} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PopularList({ stories }) {
  return (
    <div className="popular-list">
      {stories.map((story, index) => (
        <Link key={story.id} className="popular-item" to={story.path ?? '/'}>
          <span className="popular-item__index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <span className="eyebrow">{story.category}</span>
            <h4>{story.title}</h4>
            <div className="meta-row compact-meta">
              <span>By {story.author}</span>
              <span>{story.date}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function StoryGrid({ stories }) {
  return (
    <div className="story-grid">
      {stories.map((story) => (
        <Link key={story.id} className="story-grid-card story-surface" to={story.path ?? '/'}>
          <div className="story-grid-card__visual" style={{ '--story-image': toStoryImageBackground(story.image) }} />
          <div className="story-grid-card__body">
            <span className="eyebrow">{story.category}</span>
            <h3>{story.title}</h3>
            <div className="meta-row compact-meta">
              <span>By {story.author}</span>
              <span>{story.date}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function StoryMiniList({ stories }) {
  return (
    <div className="story-mini-list">
      {stories.map((story) => (
        <Link key={story.id} className="story-mini-item story-surface" to={story.path ?? '/'}>
          <span className="eyebrow">{story.category}</span>
          <h3>{story.title}</h3>
          <div className="meta-row compact-meta">
            <span>By {story.author}</span>
            <span>{story.date}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
