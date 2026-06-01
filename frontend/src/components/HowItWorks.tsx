import type { RegionConfig } from '../region';

const STEPS = [
  {
    icon: '🔍',
    title: 'Find your store',
    body: 'Search by brand or browse a category to see every live code in one place.',
  },
  {
    icon: '📋',
    title: 'Copy a verified code',
    body: 'Codes are ranked by community votes, so the ones that work float to the top.',
  },
  {
    icon: '💸',
    title: 'Save at checkout',
    body: 'Paste it, watch the total drop, then upvote it to help the next shopper.',
  },
];

export function HowItWorks({ region }: { region: RegionConfig }) {
  return (
    <section className="how" id="how-it-works" aria-labelledby="how-title">
      <div className="how__head">
        <span className="section-eyebrow">How it works</span>
        <h2 id="how-title" className="section-title">
          Saving with {region.term} in three steps
        </h2>
      </div>
      <ol className="how__steps">
        {STEPS.map((step, i) => (
          <li className="step" key={step.title}>
            <span className="step__num">{i + 1}</span>
            <span className="step__icon" aria-hidden="true">
              {step.icon}
            </span>
            <h3 className="step__title">{step.title}</h3>
            <p className="step__body">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
