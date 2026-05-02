const SEED_ARTICLES = [
  {
    cat: 'AI Models',
    title: 'OpenAI releases GPT-5 with reasoning capabilities that exceed PhD-level benchmarks',
    summary: 'GPT-5 scores in the top 1% on mathematics olympiad problems and passes bar exam simulations with 94% accuracy. The model introduces a new multi-agent reasoning layer that breaks complex problems into verifiable sub-steps before committing to an answer. Deployment begins with ChatGPT Plus subscribers before rolling out to API customers over a 90-day period.',
    source: 'The Verge',
    url: 'https://theverge.com',
    daysAgo: 0,
  },
  {
    cat: 'AI Policy',
    title: 'EU AI Act enforcement begins — what it means for every startup building with AI',
    summary: "The world's first comprehensive AI law is now binding across all 27 EU member states. High-risk AI systems — including those in hiring, credit scoring, and critical infrastructure — must implement mandatory human oversight, maintain audit logs, and undergo conformity assessments. Startups have 24 months to comply before penalties of up to 7% of global revenue apply.",
    source: 'BBC News',
    url: 'https://bbc.com/news',
    daysAgo: 0,
  },
  {
    cat: 'AI Tools',
    title: "Google DeepMind's Gemini 2.5 Pro takes the top position on every major coding benchmark",
    summary: 'Gemini 2.5 Pro has simultaneously claimed first place on SWE-bench Verified, LiveCodeBench, and AgentBench evaluations. The model completes 72% of real-world GitHub issues autonomously — a 19-point improvement over its predecessor. Google has made the model available through AI Studio with a 1 million token context window at no cost during the evaluation period.',
    source: 'TechCrunch',
    url: 'https://techcrunch.com',
    daysAgo: 0,
  },
  {
    cat: 'AI Research',
    title: "Anthropic publishes landmark interpretability research on Claude's internal reasoning circuits",
    summary: "Anthropic's safety team has mapped the computation patterns that activate when Claude detects deception attempts, refuses harmful requests, and navigates value conflicts. The research identifies 47 distinct reasoning circuits, three of which are consistently associated with alignment under pressure — maintaining helpful, honest behavior even when prompted otherwise.",
    source: 'MIT Tech Review',
    url: 'https://technologyreview.com',
    daysAgo: 1,
  },
  {
    cat: 'AI Business',
    title: "Microsoft's total OpenAI investment reaches $21 billion following latest funding round",
    summary: "Microsoft has committed an additional $4 billion to OpenAI, bringing its total investment to $21 billion since 2019. The deal includes expanded Azure integration rights, giving Microsoft exclusive cloud infrastructure for OpenAI's commercial API traffic through 2030. Analysts estimate the partnership generates over $6 billion annually in Azure revenue attributable to AI workloads.",
    source: 'Bloomberg',
    url: 'https://bloomberg.com',
    daysAgo: 1,
  },
  {
    cat: 'AI & Society',
    title: 'AI writes 30% of production code at major tech firms, Stanford study finds',
    summary: 'A survey of 500 engineering teams at technology companies with over 1,000 employees found AI-assisted code generation now accounts for 28–34% of all new production code. Teams using AI coding tools ship features 40% faster on average but report a 15% increase in post-deployment bug reports, raising questions about review quality in high-velocity environments.',
    source: 'The Economist',
    url: 'https://economist.com',
    daysAgo: 2,
  },
  {
    cat: 'Quantum',
    title: 'Quantum computing: the technology race Europe is positioned to win',
    summary: "With IQM, Pasqal, and Oxford Quantum Circuits among its fastest-growing companies, Europe now hosts 34% of the world's commercially viable quantum hardware startups. The European Quantum Flagship program has deployed €1.8 billion across 23 countries since 2018. Analysts project Europe could capture 30% of the global quantum market by 2030 if current investment trajectories hold.",
    source: 'BBC News',
    url: 'https://bbc.com',
    daysAgo: 6,
  },
  {
    cat: 'AI Hardware',
    title: "NVIDIA's Blackwell Ultra ships — inference is now four times faster at the same power envelope",
    summary: 'The GB300 Blackwell Ultra chip delivers 1.5 petaFLOPS of FP4 inference throughput, a 4x improvement over the H100 at equivalent thermal design power. NVIDIA has shipped 50,000 units to hyperscalers in the first production run, with Microsoft, Google, and Amazon collectively accounting for 78% of initial allocation. Retail availability for enterprise customers begins in Q3.',
    source: 'The Verge',
    url: 'https://theverge.com',
    daysAgo: 3,
  },
  {
    cat: 'Big Tech',
    title: "Apple's AI strategy is now clear — and it looks nothing like anyone predicted",
    summary: 'Apple Intelligence has quietly become the most-used on-device AI system in the world by active users, processing over 90 billion private requests per month across iPhone, iPad, and Mac. Rather than competing with cloud AI services, Apple positioned its system as the privacy layer — routing only what is necessary to external models like Claude and GPT.',
    source: 'The Information',
    url: 'https://theinformation.com',
    daysAgo: 4,
  },
  {
    cat: 'Startups',
    title: 'Perplexity raises $500M at an $8B valuation as AI search becomes a mainstream category',
    summary: 'The AI search company has closed a $500 million Series D round led by Accel and SoftBank Vision Fund 2. Perplexity now processes 100 million queries per day, up from 10 million 18 months ago. Partnerships with three major telecom operators will bundle Perplexity Pro with smartphone plans in the US, UK, and Japan.',
    source: 'TechCrunch',
    url: 'https://techcrunch.com',
    daysAgo: 5,
  },
  {
    cat: 'Robotics',
    title: 'Figure 02 completes its first unsupervised eight-hour warehouse shift with zero errors',
    summary: "Figure's humanoid robot completed a full operational shift at a BMW logistics facility in Spartanburg, South Carolina, handling 847 discrete pick-and-place tasks without human intervention or remote correction. The robot's on-device AI processed all decisions locally with an average task completion latency of 340 milliseconds. Figure plans to deploy 500 units across five facilities by year end.",
    source: 'Reuters',
    url: 'https://reuters.com',
    daysAgo: 5,
  },
  {
    cat: 'AI Policy',
    title: 'China publishes mandatory AI labeling standards — all generated content must be marked',
    summary: "China's Cyberspace Administration has published binding regulations requiring all AI-generated text, images, audio, and video distributed on domestic platforms to carry a machine-readable watermark and a visible disclosure label. Platforms have 90 days to implement the technical standards, which also apply to foreign companies with services accessible in China.",
    source: 'Financial Times',
    url: 'https://ft.com',
    daysAgo: 7,
  },
  {
    cat: 'AI Research',
    title: "Meta's new foundation model trains on 100 trillion tokens — the largest in history",
    summary: "Meta AI has published a paper describing Llama 4's training run, which consumed 100 trillion tokens across a dataset spanning 178 languages and 14 content modalities. The model was trained across 49,152 H100 GPUs over 63 days. Early benchmark results show state-of-the-art performance on multilingual reasoning tasks, with particular strength on low-resource languages.",
    source: 'Wired',
    url: 'https://wired.com',
    daysAgo: 8,
  },
  {
    cat: 'AI Tools',
    title: 'Cursor surpasses 1 million paying developers — the IDE market is being rewritten',
    summary: 'Cursor, the AI-native code editor built on VS Code, has crossed 1 million paid subscribers less than 18 months after its public launch. The company generates over $100 million in annualized recurring revenue and has begun hiring a 50-person enterprise sales team targeting Fortune 500 development organizations. JetBrains and Eclipse Foundation have both announced accelerated AI integration roadmaps in response.',
    source: 'The Verge',
    url: 'https://theverge.com',
    daysAgo: 9,
  },
  {
    cat: 'AI Business',
    title: "Anthropic's revenue reaches $1.8 billion ARR as enterprise adoption accelerates",
    summary: 'Anthropic has crossed $1.8 billion in annualized revenue, growing 3x in 12 months, driven primarily by enterprise API consumption. Claude models now power internal tools at 60% of Fortune 100 companies. Anthropic announced general availability of Claude for Enterprise with a compliance tier including HIPAA and SOC 2 Type II certification and a 14-day data retention window.',
    source: 'Bloomberg',
    url: 'https://bloomberg.com',
    daysAgo: 10,
  },
  {
    cat: 'Robotics',
    title: 'Boston Dynamics deploys Atlas in real manufacturing — the age of general-purpose robotics has begun',
    summary: 'Boston Dynamics has signed commercial deployment agreements with three automotive manufacturers to place 120 Atlas humanoid robots across production lines in 2025. Unlike previous industrial robots, Atlas operates without pre-programmed waypoints, using real-time visual reasoning to adapt to unstructured environments. Hyundai has committed $2 billion to scale production capacity to 10,000 units annually.',
    source: 'MIT Tech Review',
    url: 'https://technologyreview.com',
    daysAgo: 12,
  },
];

function buildSeedDocuments() {
  const now = new Date();
  return SEED_ARTICLES.map((a, i) => {
    const publishedAt = new Date(now);
    publishedAt.setDate(publishedAt.getDate() - a.daysAgo);
    publishedAt.setHours(9, 0, 0, 0);
    return {
      title: a.title,
      summary: a.summary,
      category: a.cat,
      source: a.source,
      sourceUrl: a.url,
      imageUrl: null,
      publishedAt,
      guid: `seed-article-${i}-${a.title.substring(0, 30).replace(/\s+/g, '-').toLowerCase()}`,
    };
  });
}

module.exports = { buildSeedDocuments, SEED_ARTICLES };
