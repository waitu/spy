import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toStoryImageBackground } from '../lib/content';

function SecondaryStory({ story }) {
  return (
    <Link className="story-teaser" to={story.path ?? '/'}>
      <div className="story-teaser__visual" style={{ '--story-image': toStoryImageBackground(story.image) }} />
      <div className="story-teaser__copy">
        <span className="eyebrow">{story.category}</span>
        <h3>{story.title}</h3>
        <div className="meta-row">
          <span>By {story.author}</span>
          <span>{story.date}</span>
        </div>
      </div>
    </Link>
  );
}

export function PageMasthead({ eyebrow, title, description }) {
  return (
    <section className="page-masthead site-width">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

export function HeroSection({ lead, secondary }) {
  return (
    <section className="hero-section site-width">
      <div className="hero-grid">
        <article className="lead-story">
          <div className="lead-story__visual" style={{ '--story-image': toStoryImageBackground(lead.image) }} />
          <div className="lead-story__body story-surface">
            <span className="eyebrow">{lead.category}</span>
            <h2>{lead.title}</h2>
            <div className="meta-row">
              <span>By {lead.author}</span>
              <span>{lead.date}</span>
            </div>
            <p>{lead.excerpt}</p>
            <Link className="section-link" to={lead.path ?? '/'}>
              Read the story <ArrowRight size={16} />
            </Link>
          </div>
        </article>
        <div className="hero-side-column">
          {secondary.map((story) => (
            <SecondaryStory key={story.id} story={story} />
          ))}
        </div>
      </div>
    </section>
  );
}
