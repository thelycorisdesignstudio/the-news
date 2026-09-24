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
    summary: 'Officials announced a shared framework under which frontier AI models will be evaluated by government safety institutes on both sides of the Atlantic before public release. Labs will submit models for testing on cybersecurity, biological risk and autonomy. The agreement takes effect in January and covers models trained above a set compute threshold.',
    more: [{ h: 'why it matters', p: 'It is the first time the two largest regulators of AI have agreed to test the same models before launch, which could become the default route to market for frontier labs.' }],
  },
  {
    id: 'gpt5', rank: 1, minutesAgo: 120, cat: 'AI Models', topic: 'AI Models', type: 'news', level: 'global', source: 'The Verge',
    title: 'OpenAI releases GPT-5 with reasoning capabilities that exceed PhD-level benchmarks',
    summary: "OpenAI's newest flagship model scored above human PhD experts on graduate-level science, math and coding benchmarks in the company's own evaluations. GPT-5 plans multi-step problems before answering and checks its work as it reasons. It is rolling out to paid ChatGPT users today, with developer API access next week. Independent researchers have not yet replicated the results.",
    more: [
      { h: 'what changed', p: 'GPT-5 spends more computation deciding how to approach a problem before it writes an answer. OpenAI says this reduces factual errors on long tasks and lets the model recover when an early step turns out to be wrong.' },
      { h: 'why it matters', p: 'Reasoning benchmarks have become the main way labs compare frontier models. If the results hold up under independent testing, GPT-5 would be the first widely available model to beat expert baselines across science, math and code at once.' },
      { h: "what's next", p: 'OpenAI will publish a system card with its safety evaluations alongside the API launch. Rival labs are expected to answer with their own releases within months.' },
    ],
  },
  {
    id: 'eu', rank: 2, minutesAgo: 180, cat: 'AI Policy', topic: 'AI Policy', type: 'news', level: 'global', source: 'Reuters',
    title: 'EU starts enforcing AI Act rules for general-purpose models',
    summary: 'Providers of large general-purpose AI models in the European Union must now publish training-data summaries, document their safety testing and report serious incidents to the new AI Office. Fines can reach 3% of global annual turnover. Several US labs say they already comply; smaller open-source developers are asking Brussels for clearer guidance on what counts as a systemic-risk model.',
    more: [{ h: 'why it matters', p: 'The EU is the first major market to put binding obligations on the companies that build foundation models, and other regulators are watching how enforcement works in practice.' }],
  },
  {
    id: 'metro', rank: 3, minutesAgo: 60, cat: 'Local', topic: 'Transit', type: 'news', level: 'city', country: 'IN', region: 'Karnataka', city: 'Bengaluru', lat: 12.9166, lon: 77.6101, source: 'Deccan Herald',
    title: 'Bengaluru Metro adds four trains to the Yellow Line, cutting peak waits to eight minutes',
    summary: 'Four more trainsets join the Yellow Line from Monday, bringing peak-hour frequency down from fifteen minutes to eight. The line runs from RV Road to Bommasandra through the Electronic City corridor. Feeder buses from Silk Board will run every ten minutes, and the metro corporation expects daily ridership to rise sharply within two months.',
    more: [{ h: 'what it means for you', p: 'If you commute through Silk Board or Electronic City, morning trains should be less crowded from next week. Evening frequency increases a week later.' }],
  },
  {
    id: 'fest', rank: 4, minutesAgo: 40, cat: 'Hyperlocal', topic: 'Events', type: 'local-alert', level: 'hyper', country: 'IN', region: 'Karnataka', city: 'Bengaluru', area: 'Indiranagar', lat: 12.9676, lon: 77.6408, source: 'Citizen Matters',
    title: '100 Feet Road closes to traffic this Sunday for a street food festival',
    summary: 'The stretch between the metro station and 12th Main will be closed to vehicles from 8am to 10pm on Sunday for a street food festival with more than sixty stalls. Traffic will be diverted via CMH Road and Old Airport Road. Parking is available at the metro station, and traffic police advise leaving extra time near Domlur flyover.',
    more: [{ h: 'getting around', p: 'Indiranagar metro station stays open all day. Autos and cabs will drop off at the 12th Main junction.' }],
  },
  {
    id: 'nv', rank: 5, minutesAgo: 240, cat: 'AI Hardware', topic: 'AI Hardware', type: 'news', level: 'global', source: 'Bloomberg',
    title: "Nvidia's next-generation chips promise three times the inference efficiency",
    summary: 'The new accelerators pair faster memory with a redesigned interconnect built for running AI models rather than training them. Nvidia says data centres can serve the same workload with roughly a third of the power. Cloud providers have already placed orders for next year, while AMD and several chip startups race to close the gap on price.',
    more: [{ h: 'why it matters', p: 'Running models, not training them, is now the largest share of AI compute spending. Efficiency gains here lower the cost of every chatbot query and API call.' }],
  },
  {
    id: 'robot', rank: 6, minutesAgo: 300, cat: 'Robotics', topic: 'Robotics', type: 'news', level: 'global', source: 'IEEE Spectrum',
    title: 'Humanoid robots start full shifts in a European logistics warehouse',
    summary: "A fleet of forty two-legged robots now moves totes between shelving and conveyor lines across two shifts a day. The operator says the machines reach about 60% of a human picker's throughput but can work through the night. Unions have been briefed, and no roles are being cut during the twelve-month trial, which will be reviewed quarterly.",
    more: [{ h: 'why it matters', p: 'Most humanoid robots have stayed in demos. A year-long trial in a working warehouse is one of the first tests of whether they can earn their cost on real shifts.' }],
  },
  {
    id: 'qc', rank: 7, minutesAgo: 360, cat: 'Quantum Computing', topic: 'Quantum Computing', type: 'news', level: 'global', source: 'Nature',
    title: 'Error-corrected qubits hold their state long enough for useful calculations',
    summary: "Physicists kept a group of logical qubits stable for over an hour by continuously detecting and fixing errors across hundreds of physical qubits. Previous records were measured in seconds. The result does not make quantum computers practical yet, but it shows error correction scaling in the right direction, which researchers call the field's most important open question.",
    more: [{ h: 'why it matters', p: 'Useful quantum computing depends on error correction getting better as machines get bigger. This is evidence that it can.' }],
  },
  {
    id: 'lab', rank: 8, minutesAgo: 420, cat: 'Startups', topic: 'Startups', type: 'news', level: 'global', source: 'TechCrunch',
    title: 'Open-source AI lab raises $600M to build smaller, faster models',
    summary: 'The two-year-old lab builds compact models that run on a single laptop GPU while matching larger systems on everyday tasks. The round values the company at $4.5 billion. Its founders say the money will go to compute and to a team that publishes weights and training recipes openly, which has made its models popular with enterprise developers.',
    more: [{ h: 'why it matters', p: 'Investors are backing the idea that many businesses want models they can run and inspect themselves rather than rent through an API.' }],
  },
  {
    id: 'cyber', rank: 9, minutesAgo: 480, cat: 'Cybersecurity', topic: 'Cybersecurity', type: 'news', level: 'global', source: 'Financial Times',
    title: 'Regulators warn banks about deepfake voice scams hitting call centres',
    summary: 'Fraudsters are using cloned customer voices, built from a few seconds of social-media audio, to pass phone-based identity checks and move money. Supervisors in the UK and Singapore have told banks to stop relying on voice alone. Several lenders are adding callback verification and in-app confirmation for transfers above set limits.',
    more: [{ h: 'why it matters', p: 'Voice was one of the last identity checks many banks treated as reliable. Replacing it touches millions of customer accounts.' }],
  },
  {
    id: 'sat', rank: 10, minutesAgo: 540, cat: 'Space', topic: 'Space', type: 'news', level: 'global', source: 'Ars Technica',
    title: 'Satellites begin processing images in orbit to cut download times',
    summary: 'An Earth-observation operator has switched on onboard AI that filters out cloudy and redundant images before they are sent to the ground. The company says this cuts downlink data by around 80% and gets usable wildfire and flood imagery to emergency teams within minutes rather than hours. Other operators are testing similar chips.',
    more: [{ h: 'why it matters', p: 'Ground-station bandwidth, not cameras, has been the bottleneck for satellite imagery. Processing in orbit moves that limit.' }],
  },
  // Extra coverage so every level, country and story type has something to show.
  {
    id: 'in-gpu', rank: 11, minutesAgo: 150, cat: 'AI Policy', topic: 'AI Policy', type: 'news', level: 'national', country: 'IN', source: 'Mint',
    title: 'India opens subsidised GPU access to AI startups under its national AI mission',
    summary: 'Startups and university labs can now book time on a shared pool of government-funded GPUs at well under market rates. The first tranche covers several thousand accelerators hosted by domestic cloud providers. Applications are reviewed monthly, and priority goes to teams building models for Indian languages, healthcare and agriculture.',
    more: [{ h: 'why it matters', p: 'Compute has been the main barrier for smaller Indian AI teams. Subsidised access lowers the cost of training local-language models.' }],
  },
  {
    id: 'kar-rain', rank: 12, minutesAgo: 95, cat: 'Weather', topic: 'Weather', type: 'local-alert', level: 'state', country: 'IN', region: 'Karnataka', source: 'The Hindu',
    title: 'Yellow alert for heavy rain across coastal and south interior Karnataka',
    summary: 'The weather department expects heavy showers in coastal districts and parts of south interior Karnataka through Thursday, with gusty winds near the coast. Fishermen have been told not to go to sea. Bengaluru should see evening thundershowers, and civic officials have asked residents in low-lying areas to report waterlogging early.',
    more: [{ h: 'what to do', p: 'Avoid underpasses during heavy rain and check your route before evening commutes. The city helpline takes waterlogging and fallen-tree reports around the clock.' }],
  },
  {
    id: 'wf-water', rank: 13, minutesAgo: 70, cat: 'Hyperlocal', topic: 'Civic', type: 'local-alert', level: 'hyper', country: 'IN', region: 'Karnataka', city: 'Bengaluru', area: 'Whitefield', lat: 12.9716, lon: 77.748, source: 'The Hindu',
    title: 'Whitefield water supply paused on Thursday for pipeline repairs',
    summary: 'Parts of Whitefield, Hoodi and ITPL Road will have no piped water from 6am to 6pm on Thursday while the water board replaces a damaged main. Tankers will be stationed at three points across the area. Residents are advised to store water the night before; supply should return to normal by Friday morning.',
    more: [{ h: 'where the tankers are', p: 'Hoodi circle, the ITPL main gate and Forum Neighbourhood Mall will each have a tanker from 8am.' }],
  },
  {
    id: 'kora-walk', rank: 14, minutesAgo: 130, cat: 'Hyperlocal', topic: 'Civic', type: 'news', level: 'hyper', country: 'IN', region: 'Karnataka', city: 'Bengaluru', area: 'Koramangala', lat: 12.9352, lon: 77.6245, source: 'Citizen Matters',
    title: "Koramangala's 5th Block gets a weekend pedestrian zone from this month",
    summary: 'A two-block stretch around the 5th Block market will close to cars from 5pm to 11pm on Saturdays and Sundays. The trial follows a residents\' survey in which most respondents backed fewer cars on weekend evenings. Traders will get loading windows in the morning, and the council will review footfall after three months.',
    more: [{ h: 'getting there', p: 'Parking is available at the Forum and at the BBMP lot on 80 Feet Road.' }],
  },
  {
    id: 'mum-road', rank: 15, minutesAgo: 200, cat: 'Local', topic: 'Transit', type: 'news', level: 'city', country: 'IN', region: 'Maharashtra', city: 'Mumbai', lat: 19.076, lon: 72.8777, source: 'Hindustan Times',
    title: "Mumbai's coastal road opens its northern stretch to traffic",
    summary: 'The final section of the coastal road now connects Worli to Bandra, which officials say cuts the peak-hour drive from the south of the city to the western suburbs by around half. Two-wheelers remain barred. A promenade along the sea wall opens to walkers next month.',
    more: [{ h: 'what it means for you', p: 'Expect lighter traffic on the Western Express Highway during peak hours, especially southbound in the morning.' }],
  },
  {
    id: 'uk-aisi', rank: 16, minutesAgo: 260, cat: 'AI Policy', topic: 'AI Policy', type: 'news', level: 'national', country: 'GB', source: 'BBC News',
    title: "UK's AI Security Institute publishes its first pre-release model evaluations",
    summary: 'The institute released results from testing two frontier models before launch, covering cyber-offence, chemical and biological knowledge and the ability to act autonomously. Both models passed with mitigations. Researchers note the tests are a snapshot, and the institute plans to repeat them as models are updated.',
    more: [{ h: 'why it matters', p: 'Publishing results, not just doing tests, gives outside researchers a way to check what government evaluators actually found.' }],
  },
  {
    id: 'us-chips', rank: 17, minutesAgo: 330, cat: 'AI Hardware', topic: 'AI Hardware', type: 'news', level: 'national', country: 'US', source: 'The Wall Street Journal',
    title: 'US widens export controls on advanced AI chips and chipmaking tools',
    summary: 'New rules extend licence requirements to more countries and cover a wider range of accelerators and lithography equipment. Chipmakers have ninety days to comply. Industry groups warn of lost sales abroad, while officials argue the rules close loopholes that let restricted buyers reach high-end hardware through third countries.',
    more: [{ h: 'why it matters', p: 'Export rules now shape where AI data centres get built as much as power prices do.' }],
  },
  {
    id: 'sg-ai', rank: 18, minutesAgo: 390, cat: 'AI Business', topic: 'AI Business', type: 'news', level: 'national', country: 'SG', source: 'The Straits Times',
    title: 'Singapore funds AI training for 100,000 mid-career workers',
    summary: 'The programme pays for short courses in using AI tools at work, with extra support for workers in finance, logistics and healthcare. Employers who send staff get wage subsidies for training days. The government says demand for AI skills now outstrips supply in most sectors it tracks.',
    more: [{ h: 'why it matters', p: 'Most of the productivity gains from AI depend on existing workers learning to use it, not on hiring new specialists.' }],
  },
  {
    id: 'exp-agents', rank: 19, minutesAgo: 450, cat: 'AI Tools', topic: 'AI Tools', type: 'explainer', level: 'global', source: 'MIT Technology Review',
    title: "Explainer: what AI agents can do today, and where they still fall short",
    summary: 'Agents are AI systems that take actions, like booking, filing or coding, rather than just answering questions. Today they handle well-defined tasks with clear success checks, such as fixing a failing test. They still struggle with long tasks where one early mistake compounds, and with websites that change without warning.',
    more: [{ h: 'the short version', p: 'Use agents where you can check the result quickly. Keep a person in the loop wherever a mistake is expensive.' }],
  },
  {
    id: 'op-bench', rank: 20, minutesAgo: 600, cat: 'AI & Society', topic: 'AI & Society', type: 'opinion', level: 'global', source: 'The Atlantic',
    title: 'Opinion: benchmarks are telling us less about AI than we think',
    summary: 'Leaderboards reward models for scoring well on fixed tests, and labs now train with those tests in mind. The author argues that the numbers have drifted away from what people actually need, like reliability on messy real work, and calls for more independent, rotating evaluations run by people outside the labs.',
    more: [{ h: 'the argument', p: 'A score that everyone optimises for stops measuring what it was designed to measure. Evaluations need to change as fast as the models do.' }],
  },
  {
    id: 'climate-grid', rank: 21, minutesAgo: 660, cat: 'Climate Tech', topic: 'Climate Tech', type: 'news', level: 'global', source: 'Canary Media',
    title: 'Grid-scale batteries overtake gas peakers for new capacity in several markets',
    summary: 'Utilities in California, Texas and Australia added more battery storage than gas-fired peaking plants last year, according to a new industry report. Falling cell prices and faster permitting did most of the work. Analysts expect storage to keep growing as data centres push up evening demand.',
    more: [{ h: 'why it matters', p: 'Storage lets grids use more solar after sunset, which is exactly when new AI data-centre load is hardest to meet.' }],
  },
];
