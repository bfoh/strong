const steps = [
  { title: 'Discover', text: 'Explore suitable opportunities across land, residential and commercial listings.' },
  { title: 'Enquire', text: 'Speak with the Strong Properties team about the details that matter to you.' },
  { title: 'Visit', text: 'Arrange a property viewing or site inspection at a time that works for you.' },
  { title: 'Decide', text: 'Review the information you need to move forward confidently.' },
];

export default function Approach() {
  return <section id="approach" className="approach" aria-labelledby="approach-title">
    <header className="approach-head">
      <p className="kicker" data-reveal>The Strong Properties Approach</p>
      <h2 id="approach-title" className="display" data-reveal>Guidance at <em>Every Step.</em></h2>
      <p className="lead" data-reveal>A property decision deserves time, context and a clear way forward. This is how we work alongside you.</p>
    </header>
    <ol className="steps" data-reveal>
      {steps.map(step => <li key={step.title} className="step">
        <span className="step-mark" aria-hidden="true"/>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
      </li>)}
    </ol>
  </section>;
}
