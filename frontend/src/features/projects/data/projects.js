/**
 * Frontend data helpers.
 * Project records come from the Laravel REST API; `mapApiProject` normalises
 * API card objects (toCardArray) into the shape the UI components expect.
 */

/** Real backend categories (CategorySeeder — SRS-F02-01). */
export const sectorOptions = [
  "fintech",
  "healthtech",
  "edtech",
  "ecommerce",
  "saas",
  "ai",
  "agritech",
  "logistics",
  "real_estate",
  "energy",
  "gaming",
  "social",
  "marketplace",
  "tourism",
  "other",
];

export const sectorLabels = {
  fintech: { ar: "التقنية المالية", en: "Fintech" },
  healthtech: { ar: "التقنية الصحية", en: "Healthtech" },
  edtech: { ar: "التقنية التعليمية", en: "Edtech" },
  ecommerce: { ar: "التجارة الإلكترونية", en: "E-commerce" },
  saas: { ar: "البرمجيات كخدمة", en: "SaaS" },
  ai: { ar: "الذكاء الاصطناعي", en: "Artificial Intelligence" },
  agritech: { ar: "التقنية الزراعية", en: "Agritech" },
  logistics: { ar: "اللوجستيات", en: "Logistics" },
  real_estate: { ar: "العقارات", en: "Real Estate" },
  energy: { ar: "الطاقة", en: "Energy" },
  gaming: { ar: "الألعاب", en: "Gaming" },
  social: { ar: "الشبكات الاجتماعية", en: "Social" },
  marketplace: { ar: "الأسواق الرقمية", en: "Marketplace" },
  tourism: { ar: "السياحة", en: "Tourism" },
  other: { ar: "أخرى", en: "Other" },
  // Legacy mock sectors — kept so older mock project records still render.
  ai_ml: { ar: "ذكاء اصطناعي", en: "AI/ML" },
  web: { ar: "تطبيقات ويب", en: "Web" },
  mobile: { ar: "تطبيقات جوال", en: "Mobile" },
  iot: { ar: "إنترنت الأشياء", en: "IoT" },
  cleantech: { ar: "تقنية نظيفة", en: "CleanTech" },
};

/**
 * Normalise an API project object (from `toCardArray` / `projectDetail`) into
 * the legacy shape consumed by ProjectCard and the dashboard tables.
 */
export function mapApiProject(p) {
  const category = p?.category ?? null;
  const sector = typeof category === "object" && category ? category.slug : category;

  return {
    id: String(p.id),
    title: { ar: p.title ?? "", en: p.title ?? "" },
    description: { ar: p.description ?? "", en: p.description ?? "" },
    sector: sector || "other",
    tags: p.tags ?? [],
    aiScore: Math.round(p.ai_score ?? 0),
    dimensions: p.dimensions ?? {},
    status: p.state ?? p.project_state ?? "needs_funding",
    budget: p.budget?.max ?? p.budget ?? 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at ?? p.created_at,
    publicationStatus: p.publication_status ?? null,
    views: p.view_count ?? 0,
    interested: p.interested ?? 0,
    owner: {
      name: p.owner?.name ?? p.owner_name ?? "Owner",
      role: { ar: "", en: "" },
      joinedAt: "",
    },
    repoUrl: p.github_url ?? "",
    videoUrl: p.video_url ?? "",
  };
}

export const statusLabels = {
  completed: { ar: "مكتمل", en: "Completed" },
  needs_development: { ar: "يحتاج تطوير", en: "Needs development" },
  needs_funding: { ar: "يحتاج تمويل", en: "Needs funding" },
};

export const projects = [
  {
    id: "p1",
    title: {
      ar: "منصة تقييم ذكية للمشاريع الناشئة",
      en: "Smart Evaluation Platform for Startups",
    },
    description: {
      ar: "منصة تستخدم الذكاء الاصطناعي لتقييم المشاريع الناشئة من خمسة أبعاد وتقديم توصيات قابلة للتنفيذ.",
      en: "An AI-powered platform that evaluates early-stage startups across five dimensions and delivers actionable recommendations.",
    },
    sector: "ai_ml",
    tags: ["React", "Python", "TensorFlow"],
    aiScore: 88,
    dimensions: { technical: 90, innovation: 92, market: 85, team: 88, documentation: 82 },
    status: "needs_funding",
    budget: 120000,
    createdAt: "2026-06-15T10:00:00Z",
    views: 1240,
    interested: 12,
    owner: { name: "خالد العتيبي", role: { ar: "مؤسس تقني", en: "Technical founder" }, joinedAt: "2026-01-12" },
    repoUrl: "https://github.com/example/eval-platform",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    swot: {
      strengths: [
        { ar: "خوارزمية تقييم مبتكرة بملكية فكرية واضحة", en: "Innovative scoring algorithm with clear IP" },
        { ar: "فريق تقني قوي بخبرة 8+ سنوات", en: "Strong technical team with 8+ years of experience" },
      ],
      weaknesses: [
        { ar: "نقص بيانات التدريب للأسواق العربية", en: "Lack of training data for Arabic markets" },
      ],
      opportunities: [
        { ar: "سوق تقييم المشاريع في الخليج ينمو 30% سنوياً", en: "Gulf project-evaluation market growing 30% YoY" },
      ],
      threats: [
        { ar: "منافسون عالميون قد يدخلون المنطقة", en: "Global competitors may enter the region" },
      ],
    },
  },
  {
    id: "p2",
    title: { ar: "تطبيق المزرعة الذكية", en: "Smart Farm App" },
    description: {
      ar: "تطبيق جوال لمراقبة الري والتربة باستخدام إنترنت الأشياء، يخفض استهلاك المياه 40%.",
      en: "A mobile app for irrigation and soil monitoring using IoT that cuts water usage by 40%.",
    },
    sector: "iot",
    tags: ["Flutter", "Arduino", "AWS"],
    aiScore: 74,
    dimensions: { technical: 78, innovation: 71, market: 80, team: 70, documentation: 66 },
    status: "needs_development",
    budget: 80000,
    createdAt: "2026-05-02T09:30:00Z",
    views: 860,
    interested: 7,
    owner: { name: "سارة المطيري", role: { ar: "مؤسسة", en: "Founder" }, joinedAt: "2026-02-20" },
    swot: {
      strengths: [
        { ar: "نموذج أولي يعمل في 3 مزارع تجريبية", en: "Working prototype in 3 pilot farms" },
      ],
      weaknesses: [{ ar: "اعتماد على أجهزة استشعار مستوردة", en: "Reliance on imported sensors" }],
      opportunities: [
        { ar: "رؤية 2030 تدعم الزراعة الذكية", en: "Vision 2030 supports smart agriculture" },
      ],
      threats: [{ ar: "موسمية الطلب المرتبطة بالمحاصيل", en: "Seasonal, crop-linked demand" }],
    },
  },
  {
    id: "p3",
    title: { ar: "بنك رقمي للتمويل الجماعي", en: "Digital Crowdfunding Bank" },
    description: {
      ar: "منصة تمويل جماعي متوافقة مع الشريعة للتمويلات الصغيرة في المنطقة العربية.",
      en: "A Shariah-compliant crowdfunding platform for small-ticket financing across the Arab world.",
    },
    sector: "fintech",
    tags: ["Laravel", "Vue", "MySQL"],
    aiScore: 61,
    dimensions: { technical: 68, innovation: 64, market: 75, team: 55, documentation: 48 },
    status: "needs_funding",
    budget: 250000,
    createdAt: "2026-04-18T14:00:00Z",
    views: 1520,
    interested: 15,
    owner: { name: "محمد الشمري", role: { ar: "مدير تنفيذي", en: "CEO" }, joinedAt: "2025-11-30" },
    swot: {
      strengths: [{ ar: "الترخيص الأولي من هيئة السوق المالية", en: "Initial CMA licensing" }],
      weaknesses: [{ ar: "فريق تطوير صغير", en: "Small development team" }],
      opportunities: [{ ar: "فجوة كبيرة في التمويل الأصغر", en: "Large micro-financing gap" }],
      threats: [{ ar: "متطلبات تنظيمية متغيرة", en: "Changing regulatory requirements" }],
    },
  },
  {
    id: "p4",
    title: { ar: "مساعد صحي شخصي بالذكاء الاصطناعي", en: "Personal AI Health Assistant" },
    description: {
      ar: "مساعد ذكي يتابع الأعراض ويذكر المستخدم بمواعيد الأدوية ويحيل الحالات الحرجة للطبيب.",
      en: "An AI assistant that tracks symptoms, reminds about medication and escalates critical cases.",
    },
    sector: "healthtech",
    tags: ["React Native", "OpenAI", "FastAPI"],
    aiScore: 82,
    dimensions: { technical: 85, innovation: 84, market: 78, team: 86, documentation: 76 },
    status: "needs_development",
    budget: 150000,
    createdAt: "2026-03-25T08:00:00Z",
    views: 980,
    interested: 9,
    owner: { name: "د. نورة القحطاني", role: { ar: "مؤسسة وطبيبة", en: "Founder & physician" }, joinedAt: "2025-10-05" },
    swot: {
      strengths: [{ ar: "خبرة طبية موثوقة", en: "Credible medical expertise" }],
      weaknesses: [{ ar: "حساسية البيانات الصحية العالية", en: "High sensitivity of health data" }],
      opportunities: [{ ar: "شراكات مستشفيات محتملة", en: "Potential hospital partnerships" }],
      threats: [{ ar: "تنظيم صارم للأجهزة الطبية", en: "Strict medical device regulation" }],
    },
  },
  {
    id: "p5",
    title: { ar: "سوق إلكتروني للمنتجات الحرفية", en: "Handicrafts E-commerce" },
    description: {
      ar: "منصة تبيع المنتجات الحرفية العربية مباشرة للعالم مع توثيق أصل المنتج.",
      en: "A marketplace selling Arab handicrafts worldwide with provenance tracking.",
    },
    sector: "ecommerce",
    tags: ["Next.js", "Stripe", "PostgreSQL"],
    aiScore: 47,
    dimensions: { technical: 52, innovation: 45, market: 60, team: 42, documentation: 38 },
    status: "completed",
    budget: 60000,
    createdAt: "2026-02-10T11:00:00Z",
    views: 430,
    interested: 3,
    owner: { name: "عبدالله الحربي", role: { ar: "مؤسس", en: "Founder" }, joinedAt: "2026-01-01" },
    swot: {
      strengths: [{ ar: "شبكة حرفيين واسعة", en: "Wide artisan network" }],
      weaknesses: [{ ar: "هامش ربح منخفض بعد الشحن الدولي", en: "Low margins after international shipping" }],
      opportunities: [{ ar: "طلب متزايد على المنتجات الأصلية", en: "Rising demand for authentic products" }],
      threats: [{ ar: "منافسة من الأسواق العالمية", en: "Competition from global marketplaces" }],
    },
  },
  {
    id: "p6",
    title: { ar: "منصة تعليمية تفاعلية للأطفال", en: "Interactive Kids Learning Platform" },
    description: {
      ar: "منصة gamified لتعليم الأطفال البرمجة والرياضيات باللغة العربية بأسلوب ممتع.",
      en: "A gamified platform teaching kids coding and math in Arabic through play.",
    },
    sector: "edtech",
    tags: ["Unity", "React", "Node.js"],
    aiScore: 69,
    dimensions: { technical: 72, innovation: 70, market: 65, team: 68, documentation: 60 },
    status: "needs_development",
    budget: 90000,
    createdAt: "2026-05-20T16:00:00Z",
    views: 690,
    interested: 5,
    owner: { name: "ريم العنزي", role: { ar: "مؤسسة", en: "Founder" }, joinedAt: "2026-03-14" },
    swot: {
      strengths: [{ ar: "محتوى عربي أصيل من إنتاج داخلي", en: "Original in-house Arabic content" }],
      weaknesses: [{ ar: "ارتفاع تكلفة إنتاج الألعاب", en: "High game production cost" }],
      opportunities: [{ ar: "توسع المدارس الأهلية", en: "Private school expansion" }],
      threats: [{ ar: "مجانية المنافسين الرئيسيين", en: "Main competitors are free" }],
    },
  },
  {
    id: "p7",
    title: { ar: "لعبة مغامرات تاريخية عربية", en: "Arab History Adventure Game" },
    description: {
      ar: "لعبة مغامرات ثلاثية الأبعاد تروي قصص الحضارة العربية بأسلوب عالمي.",
      en: "A 3D adventure game narrating Arab civilization stories with world-class polish.",
    },
    sector: "gaming",
    tags: ["Unreal", "C++", "Blender"],
    aiScore: 55,
    dimensions: { technical: 60, innovation: 58, market: 50, team: 62, documentation: 40 },
    status: "needs_funding",
    budget: 300000,
    createdAt: "2026-04-05T13:00:00Z",
    views: 520,
    interested: 4,
    owner: { name: "فيصل الدوسري", role: { ar: "مخرج إبداعي", en: "Creative director" }, joinedAt: "2025-12-08" },
    swot: {
      strengths: [{ ar: "رؤية فنية مميزة", en: "Distinct artistic vision" }],
      weaknesses: [{ ar: "فريق صغير للعبة ضخمة", en: "Small team for an ambitious game" }],
      opportunities: [{ ar: "دعم صندوق الألعاب الوطني", en: "National games fund support" }],
      threats: [{ ar: "مدة تطوير طويلة", en: "Long development cycle" }],
    },
  },
  {
    id: "p8",
    title: { ar: "منصة توثيق العقود الذكية", en: "Smart Contract Documentation" },
    description: {
      ar: "أداة توثق وتترجم العقود القانونية بالعربية والإنجليزية مع فحص التناقضات.",
      en: "A tool that documents and translates legal contracts in Arabic and English with contradiction checks.",
    },
    sector: "ai_ml",
    tags: ["Next.js", "LangChain", "OpenAI"],
    aiScore: 78,
    dimensions: { technical: 80, innovation: 76, market: 82, team: 74, documentation: 72 },
    status: "completed",
    budget: 110000,
    createdAt: "2026-06-01T09:00:00Z",
    views: 1100,
    interested: 11,
    owner: { name: "لينا السبيعي", role: { ar: "مؤسسة ومحامية", en: "Founder & lawyer" }, joinedAt: "2026-02-01" },
    swot: {
      strengths: [{ ar: "فهم عميق للقانون العربي", en: "Deep understanding of Arab law" }],
      weaknesses: [{ ar: "حاجة لمراجعة بشرية للمخرجات", en: "Human review required for outputs" }],
      opportunities: [{ ar: "تكامل مع مكاتب المحاماة", en: "Law firm integrations" }],
      threats: [{ ar: "التطور السريع للنماذج اللغوية", en: "Rapid LLM evolution" }],
    },
  },
  {
    id: "p9",
    title: { ar: "نظام تحلية مياه بالطاقة الشمسية", en: "Solar Water Desalination System" },
    description: {
      ar: "نظام تحلية موزع بتكلفة منخفضة يعمل بالطاقة الشمسية للقرى الساحلية.",
      en: "A low-cost distributed solar-powered desalination system for coastal villages.",
    },
    sector: "cleantech",
    tags: ["Embedded", "Solar", "Python"],
    aiScore: 35,
    dimensions: { technical: 40, innovation: 44, market: 30, team: 38, documentation: 25 },
    status: "needs_development",
    budget: 200000,
    createdAt: "2026-03-01T10:00:00Z",
    views: 310,
    interested: 2,
    owner: { name: "مهند الزهراني", role: { ar: "مهندس طاقة", en: "Energy engineer" }, joinedAt: "2026-01-20" },
    swot: {
      strengths: [{ ar: "تكلفة تشغيل شبه معدومة", en: "Near-zero operating cost" }],
      weaknesses: [{ ar: "كفاءة محدودة عند الغيوم", en: "Limited efficiency in cloud cover" }],
      opportunities: [{ ar: "أهداف الاستدامة الوطنية", en: "National sustainability targets" }],
      threats: [{ ar: "تقنيات بديلة ناضجة", en: "Mature alternative technologies" }],
    },
  },
];
