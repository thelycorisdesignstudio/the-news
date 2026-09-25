import type { Story } from '../shared/domain';

/**
 * Demo stories. The first eleven are the stories from the design; the rest give every coverage
 * level, country and story type something to show. They are sample content, not real reporting:
 * replace them by pointing an ingest pipeline at POST /api/admin/stories and setting SEED_DEMO=0.
 */
type Seed = Omit<Story, 'publishedAt' | 'url'> & { minutesAgo: number; rank: number; url?: string };

export const SEED_STORIES: Seed[] = [
  {
    id: 'brk', rank: 0, minutesAgo: 12, cat: 'AI Policy', topic: 'AI Policy', type: 'breaking', level: 'global', source: 'Associated Press',
    title: 'US and EU agree joint safety testing for the most powerful AI models',
    summary: "Frontier AI models will be tested by government safety institutes in the US and EU before public release. Labs submit models for cybersecurity, biological-risk and autonomy checks. The framework starts in January and covers the largest training runs.",
    more: [{ h: 'why it matters', p: 'It is the first time the two largest regulators of AI have agreed to test the same models before launch, which could become the default route to market for frontier labs.' }],
  },
  {
    id: 'gpt5', rank: 1, minutesAgo: 120, cat: 'AI Models', topic: 'AI Models', type: 'news', level: 'global', source: 'The Verge',
    title: 'OpenAI releases GPT-5 with reasoning capabilities that exceed PhD-level benchmarks',
    summary: "OpenAI's GPT-5 beat PhD-level experts on graduate science, math and coding benchmarks in the company's own tests. It plans multi-step problems and checks its work as it reasons. Paid ChatGPT users get it today; developers next week.",
    more: [
      { h: 'what changed', p: 'GPT-5 spends more computation deciding how to approach a problem before it writes an answer. OpenAI says this reduces factual errors on long tasks and lets the model recover when an early step turns out to be wrong.' },
      { h: 'why it matters', p: 'Reasoning benchmarks have become the main way labs compare frontier models. If the results hold up under independent testing, GPT-5 would be the first widely available model to beat expert baselines across science, math and code at once.' },
      { h: "what's next", p: 'OpenAI will publish a system card with its safety evaluations alongside the API launch. Rival labs are expected to answer with their own releases within months.' },
    ],
  },
  {
    id: 'eu', rank: 2, minutesAgo: 180, cat: 'AI Policy', topic: 'AI Policy', type: 'news', level: 'global', source: 'Reuters',
    title: 'EU starts enforcing AI Act rules for general-purpose models',
    summary: "Makers of large general-purpose AI models in the EU must now publish training-data summaries, document safety testing and report serious incidents. Fines reach 3% of global turnover. Open-source developers want clearer rules on what counts as systemic risk.",
    more: [{ h: 'why it matters', p: 'The EU is the first major market to put binding obligations on the companies that build foundation models, and other regulators are watching how enforcement works in practice.' }],
  },
  {
    id: 'metro', rank: 3, minutesAgo: 60, cat: 'Local', topic: 'Transit', type: 'news', level: 'city', country: 'IN', region: 'Karnataka', city: 'Bengaluru', lat: 12.9166, lon: 77.6101, source: 'Deccan Herald',
    title: 'Bengaluru Metro adds four trains to the Yellow Line, cutting peak waits to eight minutes',
    summary: "Four more trains join Bengaluru's Yellow Line from Monday, cutting peak-hour waits from fifteen minutes to eight between RV Road and Bommasandra. Feeder buses from Silk Board will run every ten minutes to meet the extra trains.",
    more: [{ h: 'what it means for you', p: 'If you commute through Silk Board or Electronic City, morning trains should be less crowded from next week. Evening frequency increases a week later.' }],
  },
  {
    id: 'fest', rank: 4, minutesAgo: 40, cat: 'Hyperlocal', topic: 'Events', type: 'local-alert', level: 'hyper', country: 'IN', region: 'Karnataka', city: 'Bengaluru', area: 'Indiranagar', lat: 12.9676, lon: 77.6408, source: 'Citizen Matters',
    title: '100 Feet Road closes to traffic this Sunday for a street food festival',
    summary: "100 Feet Road closes to traffic between the metro station and 12th Main from 8am to 10pm on Sunday for a sixty-stall street food festival. Traffic diverts via CMH Road and Old Airport Road; the metro station stays open.",
    more: [{ h: 'getting around', p: 'Indiranagar metro station stays open all day. Autos and cabs will drop off at the 12th Main junction.' }],
  },
  {
    id: 'nv', rank: 5, minutesAgo: 240, cat: 'AI Hardware', topic: 'AI Hardware', type: 'news', level: 'global', source: 'Bloomberg',
    title: "Nvidia's next-generation chips promise three times the inference efficiency",
    summary: "Nvidia's new accelerators are built to run AI models rather than train them, and the company says they serve the same workload on a third of the power. Cloud providers have already ordered them for next year.",
    more: [{ h: 'why it matters', p: 'Running models, not training them, is now the largest share of AI compute spending. Efficiency gains here lower the cost of every chatbot query and API call.' }],
  },
  {
    id: 'robot', rank: 6, minutesAgo: 300, cat: 'Robotics', topic: 'Robotics', type: 'news', level: 'global', source: 'IEEE Spectrum',
    title: 'Humanoid robots start full shifts in a European logistics warehouse',
    summary: "Forty two-legged robots now work two shifts a day in a European logistics warehouse, moving totes at about 60% of a human picker's pace. No jobs are being cut during the twelve-month trial.",
    more: [{ h: 'why it matters', p: 'Most humanoid robots have stayed in demos. A year-long trial in a working warehouse is one of the first tests of whether they can earn their cost on real shifts.' }],
  },
  {
    id: 'qc', rank: 7, minutesAgo: 360, cat: 'Quantum Computing', topic: 'Quantum Computing', type: 'news', level: 'global', source: 'Nature',
    title: 'Error-corrected qubits hold their state long enough for useful calculations',
    summary: "Physicists kept logical qubits stable for over an hour by continuously correcting errors across hundreds of physical qubits. Earlier records lasted seconds. It isn't a practical quantum computer yet, but error correction is finally scaling the right way.",
    more: [{ h: 'why it matters', p: 'Useful quantum computing depends on error correction getting better as machines get bigger. This is evidence that it can.' }],
  },
  {
    id: 'lab', rank: 8, minutesAgo: 420, cat: 'Startups', topic: 'Startups', type: 'news', level: 'global', source: 'TechCrunch',
    title: 'Open-source AI lab raises $600M to build smaller, faster models',
    summary: "A two-year-old open-source AI lab raised $600 million at a $4.5 billion valuation to build compact models that run on a single laptop GPU. It publishes its weights and training recipes, which has made it popular with enterprises.",
    more: [{ h: 'why it matters', p: 'Investors are backing the idea that many businesses want models they can run and inspect themselves rather than rent through an API.' }],
  },
  {
    id: 'cyber', rank: 9, minutesAgo: 480, cat: 'Cybersecurity', topic: 'Cybersecurity', type: 'news', level: 'global', source: 'Financial Times',
    title: 'Regulators warn banks about deepfake voice scams hitting call centres',
    summary: "Fraudsters are cloning customers' voices from seconds of social-media audio to pass phone checks and move money. UK and Singapore regulators told banks to stop relying on voice alone; lenders are adding callbacks and in-app approvals.",
    more: [{ h: 'why it matters', p: 'Voice was one of the last identity checks many banks treated as reliable. Replacing it touches millions of customer accounts.' }],
  },
  {
    id: 'sat', rank: 10, minutesAgo: 540, cat: 'Space', topic: 'Space', type: 'news', level: 'global', source: 'Ars Technica',
    title: 'Satellites begin processing images in orbit to cut download times',
    summary: "An Earth-observation company now filters out cloudy and duplicate images on board its satellites before sending them down. That cuts downlinked data by around 80% and gets wildfire and flood imagery to emergency teams within minutes.",
    more: [{ h: 'why it matters', p: 'Ground-station bandwidth, not cameras, has been the bottleneck for satellite imagery. Processing in orbit moves that limit.' }],
  },
  // Extra coverage so every level, country and story type has something to show.
  {
    id: 'in-gpu', rank: 11, minutesAgo: 150, cat: 'AI Policy', topic: 'AI Policy', type: 'news', level: 'national', country: 'IN', source: 'Mint',
    title: 'India opens subsidised GPU access to AI startups under its national AI mission',
    summary: "Indian startups and university labs can now book government-funded GPUs at well below market rates. Several thousand accelerators are in the first tranche, and teams building for Indian languages, healthcare and agriculture get priority.",
    more: [{ h: 'why it matters', p: 'Compute has been the main barrier for smaller Indian AI teams. Subsidised access lowers the cost of training local-language models.' }],
  },
  {
    id: 'kar-rain', rank: 12, minutesAgo: 95, cat: 'Weather', topic: 'Weather', type: 'local-alert', level: 'state', country: 'IN', region: 'Karnataka', source: 'The Hindu',
    title: 'Yellow alert for heavy rain across coastal and south interior Karnataka',
    summary: "Heavy rain is forecast for coastal and south interior Karnataka through Thursday, with gusty winds on the coast and fishermen told to stay ashore. Bengaluru should expect evening thundershowers; report waterlogging to the city helpline.",
    more: [{ h: 'what to do', p: 'Avoid underpasses during heavy rain and check your route before evening commutes. The city helpline takes waterlogging and fallen-tree reports around the clock.' }],
  },
  {
    id: 'wf-water', rank: 13, minutesAgo: 70, cat: 'Hyperlocal', topic: 'Civic', type: 'local-alert', level: 'hyper', country: 'IN', region: 'Karnataka', city: 'Bengaluru', area: 'Whitefield', lat: 12.9716, lon: 77.748, source: 'The Hindu',
    title: 'Whitefield water supply paused on Thursday for pipeline repairs',
    summary: "Whitefield, Hoodi and ITPL Road will have no piped water from 6am to 6pm on Thursday while a damaged main is replaced. Tankers will stand at three points; store water the night before. Supply returns Friday morning.",
    more: [{ h: 'where the tankers are', p: 'Hoodi circle, the ITPL main gate and Forum Neighbourhood Mall will each have a tanker from 8am.' }],
  },
  {
    id: 'kora-walk', rank: 14, minutesAgo: 130, cat: 'Hyperlocal', topic: 'Civic', type: 'news', level: 'hyper', country: 'IN', region: 'Karnataka', city: 'Bengaluru', area: 'Koramangala', lat: 12.9352, lon: 77.6245, source: 'Citizen Matters',
    title: "Koramangala's 5th Block gets a weekend pedestrian zone from this month",
    summary: "Two blocks around Koramangala's 5th Block market close to cars from 5pm to 11pm every weekend, starting this month. Most residents backed it in a survey, traders get morning loading windows, and the council reviews it in three months.",
    more: [{ h: 'getting there', p: 'Parking is available at the Forum and at the BBMP lot on 80 Feet Road.' }],
  },
  {
    id: 'mum-road', rank: 15, minutesAgo: 200, cat: 'Local', topic: 'Transit', type: 'news', level: 'city', country: 'IN', region: 'Maharashtra', city: 'Mumbai', lat: 19.076, lon: 72.8777, source: 'Hindustan Times',
    title: "Mumbai's coastal road opens its northern stretch to traffic",
    summary: "The coastal road's final stretch now links Worli to Bandra, roughly halving the peak-hour drive from south Mumbai to the western suburbs. Two-wheelers stay barred, and the seafront promenade opens to walkers next month.",
    more: [{ h: 'what it means for you', p: 'Expect lighter traffic on the Western Express Highway during peak hours, especially southbound in the morning.' }],
  },
  {
    id: 'uk-aisi', rank: 16, minutesAgo: 260, cat: 'AI Policy', topic: 'AI Policy', type: 'news', level: 'national', country: 'GB', source: 'BBC News',
    title: "UK's AI Security Institute publishes its first pre-release model evaluations",
    summary: "The UK's AI Security Institute published results from testing two frontier models before launch, covering cyber-offence, chemical and biological knowledge and autonomy. Both passed with safeguards, and the institute will retest as the models change.",
    more: [{ h: 'why it matters', p: 'Publishing results, not just doing tests, gives outside researchers a way to check what government evaluators actually found.' }],
  },
  {
    id: 'us-chips', rank: 17, minutesAgo: 330, cat: 'AI Hardware', topic: 'AI Hardware', type: 'news', level: 'national', country: 'US', source: 'The Wall Street Journal',
    title: 'US widens export controls on advanced AI chips and chipmaking tools',
    summary: "New US rules require licences for advanced AI chips and chipmaking tools in more countries. Companies have ninety days to comply. Industry warns of lost sales; officials say it closes routes restricted buyers used through third countries.",
    more: [{ h: 'why it matters', p: 'Export rules now shape where AI data centres get built as much as power prices do.' }],
  },
  {
    id: 'sg-ai', rank: 18, minutesAgo: 390, cat: 'AI Business', topic: 'AI Business', type: 'news', level: 'national', country: 'SG', source: 'The Straits Times',
    title: 'Singapore funds AI training for 100,000 mid-career workers',
    summary: "Singapore will pay for 100,000 mid-career workers to learn AI tools, focusing on finance, logistics and healthcare. Employers get wage subsidies for training days, as demand for AI skills outstrips supply in most sectors.",
    more: [{ h: 'why it matters', p: 'Most of the productivity gains from AI depend on existing workers learning to use it, not on hiring new specialists.' }],
  },
  {
    id: 'exp-agents', rank: 19, minutesAgo: 450, cat: 'AI Tools', topic: 'AI Tools', type: 'explainer', level: 'global', source: 'MIT Technology Review',
    title: "Explainer: what AI agents can do today, and where they still fall short",
    summary: "AI agents take actions like booking, filing or coding instead of just answering. They're reliable on well-defined tasks with clear checks, like fixing a failing test, but still stumble on long tasks and websites that change.",
    more: [{ h: 'the short version', p: 'Use agents where you can check the result quickly. Keep a person in the loop wherever a mistake is expensive.' }],
  },
  {
    id: 'op-bench', rank: 20, minutesAgo: 600, cat: 'AI & Society', topic: 'AI & Society', type: 'opinion', level: 'global', source: 'The Atlantic',
    title: 'Opinion: benchmarks are telling us less about AI than we think',
    summary: "Labs now train with AI leaderboards in mind, so the scores say less about real-world reliability, the author argues. The fix: independent evaluations that rotate often and are run by people outside the labs.",
    more: [{ h: 'the argument', p: 'A score that everyone optimises for stops measuring what it was designed to measure. Evaluations need to change as fast as the models do.' }],
  },
  {
    id: 'climate-grid', rank: 21, minutesAgo: 660, cat: 'Climate Tech', topic: 'Climate Tech', type: 'news', level: 'global', source: 'Canary Media',
    title: 'Grid-scale batteries overtake gas peakers for new capacity in several markets',
    summary: "Utilities in California, Texas and Australia added more battery storage than gas peaking plants last year, thanks to cheaper cells and faster permits. Analysts expect storage to keep growing as data centres push evening demand higher.",
    more: [{ h: 'why it matters', p: 'Storage lets grids use more solar after sunset, which is exactly when new AI data-centre load is hardest to meet.' }],
  },
];
