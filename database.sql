--
-- PostgreSQL database dump
--

\restrict 4BTWSfLbh5v1gnpRF6qpsPR13AZUWbGaMIBVA3kLT8w22IQjnLPmnJDBIRbX7Pm

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: ContactSubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactSubmission" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: JobApplication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JobApplication" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    portfolio text,
    "cvUrl" text NOT NULL,
    "coverLetter" text,
    status text DEFAULT 'Pending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: JobOpening; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JobOpening" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    department text,
    location text,
    type text DEFAULT 'Full-time'::text NOT NULL,
    description text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NewsletterSubscriber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NewsletterSubscriber" (
    id text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Page; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Page" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "seoMeta" text
);


--
-- Name: Post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Post" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text NOT NULL,
    image text,
    category text,
    author text,
    type text DEFAULT 'blog'::text NOT NULL,
    published boolean DEFAULT false NOT NULL,
    "seoMeta" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    "imageUrl" text NOT NULL,
    content text NOT NULL,
    link text,
    tags text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Section; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Section" (
    id text NOT NULL,
    "pageId" text NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    "order" integer NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Name: SiteConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SiteConfig" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    role text DEFAULT 'USER'::text NOT NULL
);


--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: seo_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_audits (
    id text NOT NULL,
    "runAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "totalPages" integer DEFAULT 0 NOT NULL,
    "indexedPages" integer DEFAULT 0 NOT NULL,
    "nonIndexedPages" integer DEFAULT 0 NOT NULL,
    "brokenPages" integer DEFAULT 0 NOT NULL,
    "brokenLinks" integer DEFAULT 0 NOT NULL,
    "missingTitles" integer DEFAULT 0 NOT NULL,
    "duplicateTitles" integer DEFAULT 0 NOT NULL,
    "missingDescriptions" integer DEFAULT 0 NOT NULL,
    "duplicateDescriptions" integer DEFAULT 0 NOT NULL,
    "missingH1" integer DEFAULT 0 NOT NULL,
    "multipleH1" integer DEFAULT 0 NOT NULL,
    "missingAlt" integer DEFAULT 0 NOT NULL,
    "orphanPages" integer DEFAULT 0 NOT NULL,
    "missingSchema" integer DEFAULT 0 NOT NULL,
    "overallScore" double precision DEFAULT 0 NOT NULL,
    "technicalScore" double precision DEFAULT 0 NOT NULL,
    "contentScore" double precision DEFAULT 0 NOT NULL,
    "issuesSummaryJson" text,
    status text DEFAULT 'complete'::text NOT NULL
);


--
-- Name: seo_automation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_automation_logs (
    id text NOT NULL,
    action text NOT NULL,
    "pageId" text,
    "pageType" text,
    url text,
    before text,
    after text,
    status text DEFAULT 'success'::text NOT NULL,
    "triggeredBy" text DEFAULT 'auto'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seo_brand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_brand (
    id text NOT NULL,
    "brandName" text NOT NULL,
    "businessName" text,
    tagline text,
    "logoUrl" text,
    "websiteUrl" text,
    "founderName" text,
    "founderTitle" text,
    "founderBio" text,
    "founderImage" text,
    "servicesJson" text,
    "locationsJson" text,
    "socialProfilesJson" text,
    "awardsJson" text,
    "certificationsJson" text,
    "reviewsJson" text,
    "industryKeywords" text,
    "brandScore" double precision DEFAULT 0 NOT NULL,
    "consistencyScore" double precision DEFAULT 0 NOT NULL,
    "schemaJson" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seo_clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_clusters (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "pillarPageId" text,
    "childPagesJson" text,
    keywords text,
    "topicsJson" text,
    "healthScore" double precision DEFAULT 0 NOT NULL,
    "authorityScore" double precision DEFAULT 0 NOT NULL,
    "missingTopics" text,
    "suggestedContent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seo_content_gaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_content_gaps (
    id text NOT NULL,
    type text NOT NULL,
    gap text NOT NULL,
    description text,
    priority text DEFAULT 'medium'::text NOT NULL,
    "clusterId" text,
    "sourceUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seo_ctr_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_ctr_reports (
    id text NOT NULL,
    "pageId" text,
    url text NOT NULL,
    "currentTitle" text,
    "currentDescription" text,
    "avgPosition" double precision DEFAULT 0 NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    ctr double precision DEFAULT 0 NOT NULL,
    "expectedCtr" double precision DEFAULT 0 NOT NULL,
    "suggestedTitlesJson" text,
    "suggestedDescsJson" text,
    "ctrImprovementScore" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seo_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_entities (
    id text NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    description text,
    aliases text,
    sitewide boolean DEFAULT false NOT NULL,
    "pagesJson" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seo_internal_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_internal_links (
    id text NOT NULL,
    "fromPageId" text NOT NULL,
    "toPageId" text NOT NULL,
    "anchorText" text,
    url text NOT NULL,
    "isBroken" boolean DEFAULT false NOT NULL,
    "isSuggested" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seo_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_issues (
    id text NOT NULL,
    "pageType" text,
    "pageId" text,
    url text,
    type text NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    suggestion text,
    "isFixed" boolean DEFAULT false NOT NULL,
    "fixedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seo_keyword_opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_keyword_opportunities (
    id text NOT NULL,
    keyword text NOT NULL,
    "pageId" text,
    url text,
    "currentPosition" double precision,
    impressions integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    ctr double precision DEFAULT 0 NOT NULL,
    "positionBucket" text,
    "opportunityScore" double precision DEFAULT 0 NOT NULL,
    "trafficOpportunity" integer DEFAULT 0 NOT NULL,
    "recommendationsJson" text,
    "dataSource" text DEFAULT 'search_console'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seo_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_pages (
    id text NOT NULL,
    "pageType" text NOT NULL,
    "pageId" text NOT NULL,
    url text NOT NULL,
    title text,
    "metaTitle" text,
    "metaDescription" text,
    h1 text,
    "headingsJson" text,
    "wordCount" integer DEFAULT 0 NOT NULL,
    "readabilityScore" double precision DEFAULT 0 NOT NULL,
    "keywordDensityJson" text,
    "internalLinksCount" integer DEFAULT 0 NOT NULL,
    "externalLinksCount" integer DEFAULT 0 NOT NULL,
    "imagesCount" integer DEFAULT 0 NOT NULL,
    "imagesWithAlt" integer DEFAULT 0 NOT NULL,
    "hasFaq" boolean DEFAULT false NOT NULL,
    "hasSchema" boolean DEFAULT false NOT NULL,
    "schemaTypes" text,
    "contentScore" double precision DEFAULT 0 NOT NULL,
    "technicalScore" double precision DEFAULT 0 NOT NULL,
    "entityScore" double precision DEFAULT 0 NOT NULL,
    "internalLinkScore" double precision DEFAULT 0 NOT NULL,
    "schemaScore" double precision DEFAULT 0 NOT NULL,
    "ctrScore" double precision DEFAULT 0 NOT NULL,
    "overallScore" double precision DEFAULT 0 NOT NULL,
    "issuesJson" text,
    "recommendationsJson" text,
    "isIndexed" boolean DEFAULT true NOT NULL,
    "isOrphan" boolean DEFAULT false NOT NULL,
    "lastAnalyzed" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seo_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_reports (
    id text NOT NULL,
    type text DEFAULT 'weekly'::text NOT NULL,
    title text NOT NULL,
    "summaryJson" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seo_schema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_schema (
    id text NOT NULL,
    "pageType" text NOT NULL,
    "pageId" text NOT NULL,
    "schemaType" text NOT NULL,
    "schemaJson" text NOT NULL,
    "isValid" boolean DEFAULT true NOT NULL,
    "errorsJson" text,
    "isApplied" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seo_search_console; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_search_console (
    id text NOT NULL,
    "fetchedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dateRange" text NOT NULL,
    "totalClicks" integer DEFAULT 0 NOT NULL,
    "totalImpressions" integer DEFAULT 0 NOT NULL,
    "avgCtr" double precision DEFAULT 0 NOT NULL,
    "avgPosition" double precision DEFAULT 0 NOT NULL,
    "topPagesJson" text,
    "topQueriesJson" text,
    "rankingDropsJson" text,
    "cannibalizationJson" text,
    "lowCtrPagesJson" text,
    connected boolean DEFAULT false NOT NULL,
    "siteUrl" text
);


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: ContactSubmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContactSubmission" (id, name, email, phone, message, read, "createdAt") FROM stdin;
\.


--
-- Data for Name: JobApplication; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JobApplication" (id, "jobId", name, email, phone, portfolio, "cvUrl", "coverLetter", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: JobOpening; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JobOpening" (id, title, slug, department, location, type, description, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: NewsletterSubscriber; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NewsletterSubscriber" (id, email, "createdAt") FROM stdin;
\.


--
-- Data for Name: Page; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Page" (id, slug, title, "isPublished", "seoMeta") FROM stdin;
cmq17tlcu00007wv3kebcwj61	home	Home	t	{"title":"karmakoders – Premium AI Business Portfolio","description":"We build premium, scalable, and immersive web platforms powered by advanced AI."}
cmq17tldu00017wv3uc9toj00	portfolio	Portfolio	t	{"title":"Portfolio | karmakoders","description":"Transforming visions into digital reality - our selected works and case studies."}
cmq17tle000027wv326vty4cg	pricing	Pricing	t	{"title":"Pricing | karmakoders","description":"Explore our flexible pricing plans tailored for your digital success."}
cmq17tle600037wv3umr99q17	about	About	t	{"title":"About Us | karmakoders","description":"Learn more about the minds behind karmakoders and our mission."}
cmq17tleb00047wv39w0zkrij	blog	Blog	t	{"title":"Blog | karmakoders","description":"Insights, tutorials, and updates from the karmakoders team."}
cmq17tleg00057wv31s18w8wz	careers	Careers	t	{"title":"Careers | karmakoders","description":"Join our team and help build the future of digital experiences."}
cmq17tlel00067wv37rsq3kqd	contact	Contact	t	{"title":"Contact | karmakoders","description":"Get in touch with karmakoders for your next project."}
cmq17tleq00077wv3g6t3f149	services	Services	t	{"title":"Services | karmakoders","description":"Explore our full range of design and development services."}
cmq17tlev00087wv3s6j4cbmc	case-studies	Case Studies	t	{"title":"Case Studies | karmakoders","description":"Real-world results from our client partnerships."}
cmq17tlf600097wv3okrv4orv	help-center	Help Center	t	\N
cmq17tlfa000a7wv3z7t9i5da	terms	Terms of Service	t	\N
cmq17tlfh000b7wv35cpfioea	privacy	Privacy Policy	t	\N
cmq17tlfm000c7wv3mapnbth0	cookie-policy	Cookie Policy	t	\N
cmq17tlfq000d7wv397o0hbtt	contact-support	Contact Support	t	\N
\.


--
-- Data for Name: Post; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Post" (id, title, slug, excerpt, content, image, category, author, type, published, "seoMeta", "createdAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, title, slug, description, "imageUrl", content, link, tags, "createdAt") FROM stdin;
\.


--
-- Data for Name: Section; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Section" (id, "pageId", type, content, "order") FROM stdin;
section-pricing-main	cmq17tle000027wv326vty4cg	pricing	{"tagline":"Pricing Architecture","heading":"Invest in Your Digital Dominance","plans":[{"name":"Starter","monthlyPrice":"$99","yearlyPrice":"$950","description":"Perfect for stealth startups looking to establish a premium digital footprint.","features":["1 Landing Page","Basic Animations","Standard SEO","Email Support","1 Month Maintenance"],"isPopular":false},{"name":"Professional","monthlyPrice":"$299","yearlyPrice":"$2,850","description":"The ideal solution for growing tech agencies needing advanced features and AI.","features":["Up to 5 Pages","Advanced 3D Effects","Full AI Agent Integration","24/7 Priority Support","3 Months Maintenance","Dynamic CMS Access"],"isPopular":true},{"name":"Enterprise","monthlyPrice":"Custom","yearlyPrice":"Custom","description":"Fully bespoke SaaS architectures for large-scale enterprise requirements.","features":["Unlimited Pages","Custom 3D Environments","Private AI Model Training","Dedicated Engineering Team","12 Months Maintenance","Multi-region Support"],"isPopular":false}]}	0
section-pricing-faq	cmq17tle000027wv326vty4cg	faq	{"tagline":"FAQ","heading":"Common Questions","faqs":[{"question":"How long does a typical project take?","answer":"Project timelines vary depending on complexity. A standard landing page takes about 2-3 weeks, while complex platforms can take 2-4 months."},{"question":"What industries do you specialize in?","answer":"We have experience across fintech, healthcare, e-commerce, real estate, and entertainment."},{"question":"Do you offer post-launch support?","answer":"Yes, we provide tiered maintenance and support packages to ensure your platform remains secure and up-to-date."},{"question":"Can you work with our existing brand guidelines?","answer":"Absolutely. We can build upon your existing brand identity or help you evolve it into a modern digital-first aesthetic."},{"question":"How does your AI redesign system work?","answer":"Our proprietary AI engine analyzes design trends and user inspiration images to generate dynamic theme tokens."}]}	1
section-hero-home	cmq17tlcu00007wv3kebcwj61	hero	{"headline":"Design the Future of Your Brand","subheadline":"We build premium, scalable, and immersive web platforms powered by advanced AI and cutting-edge 3D technologies.","ctaPrimary":"Explore Portfolio","ctaSecondary":"Our Services"}	0
section-partners-home	cmq17tlcu00007wv3kebcwj61	partners	{}	1
section-services-home	cmq17tlcu00007wv3kebcwj61	services	{"tagline":"Our Expertise","heading":"Comprehensive Solutions for Your Business","description":"We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape."}	2
section-techstack-home	cmq17tlcu00007wv3kebcwj61	techstack	{}	3
section-projects-home	cmq17tlcu00007wv3kebcwj61	projects	{"tagline":"Selected Works","heading":"Transforming Visions into Digital Reality","limit":6,"showViewAll":true}	4
section-feedback-home	cmq17tlcu00007wv3kebcwj61	feedback	{}	5
section-team-home	cmq17tlcu00007wv3kebcwj61	team	{"tagline":"Our Team","heading":"The Minds Behind karmakoders"}	6
section-faq-home	cmq17tlcu00007wv3kebcwj61	faq	{"tagline":"FAQ","heading":"Common Questions","faqs":[{"question":"How long does a typical project take?","answer":"Project timelines vary depending on complexity. A standard landing page takes about 2-3 weeks, while complex platforms can take 2-4 months."},{"question":"What industries do you specialize in?","answer":"We have experience across fintech, healthcare, e-commerce, real estate, and entertainment."},{"question":"Do you offer post-launch support?","answer":"Yes, we provide tiered maintenance and support packages to ensure your platform remains secure and up-to-date."},{"question":"Can you work with our existing brand guidelines?","answer":"Absolutely. We can build upon your existing brand identity or help you evolve it into a modern digital-first aesthetic."},{"question":"How does your AI redesign system work?","answer":"Our proprietary AI engine analyzes design trends and user inspiration images to generate dynamic theme tokens."}]}	7
section-contact-home	cmq17tlcu00007wv3kebcwj61	contact	{"tagline":"Get in Touch","heading":"Start Your Project Today","description":"Have an idea or project in mind? Reach out and let's build the future together."}	8
section-about-main	cmq17tle600037wv3umr99q17	about	{"tagline":"About Us","heading":"The Minds Behind karmakoders","body":"We are a team of passionate designers and engineers building premium digital experiences powered by AI."}	0
section-about-team	cmq17tle600037wv3umr99q17	team	{"tagline":"Our Team","heading":"Meet the Experts"}	1
section-about-testimonials	cmq17tle600037wv3umr99q17	testimonials	{"tagline":"Testimonials","heading":"What Our Clients Say"}	2
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: SiteConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SiteConfig" (id, key, value, "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "emailVerified", image, role) FROM stdin;
\.


--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d74db3cf-3362-47a5-86d2-6eaddf48205b	0f30d5775e97886caac37918b0157a1bc4d1b1cc4332bc6711b067b9cac04a99	2026-06-03 22:18:32.43492+05:30	20260603164831_init_seo	\N	\N	2026-06-03 22:18:31.979183+05:30	1
\.


--
-- Data for Name: seo_audits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_audits (id, "runAt", "totalPages", "indexedPages", "nonIndexedPages", "brokenPages", "brokenLinks", "missingTitles", "duplicateTitles", "missingDescriptions", "duplicateDescriptions", "missingH1", "multipleH1", "missingAlt", "orphanPages", "missingSchema", "overallScore", "technicalScore", "contentScore", "issuesSummaryJson", status) FROM stdin;
cmpydmmt000006kv3now9qied	2026-06-03 18:05:09.492	0	0	0	0	0	0	0	0	0	0	0	0	0	0	100	100	80	[]	complete
\.


--
-- Data for Name: seo_automation_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_automation_logs (id, action, "pageId", "pageType", url, before, after, status, "triggeredBy", "createdAt") FROM stdin;
cmq18afu200367wv3g2o0syu9	generate_schema	cmq17tlcu00007wv3kebcwj61	page	/	No structured data schema	Applied valid JSON-LD schema: Organization	success	auto	2026-06-05 17:59:01.034
\.


--
-- Data for Name: seo_brand; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_brand (id, "brandName", "businessName", tagline, "logoUrl", "websiteUrl", "founderName", "founderTitle", "founderBio", "founderImage", "servicesJson", "locationsJson", "socialProfilesJson", "awardsJson", "certificationsJson", "reviewsJson", "industryKeywords", "brandScore", "consistencyScore", "schemaJson", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: seo_clusters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_clusters (id, name, slug, "pillarPageId", "childPagesJson", keywords, "topicsJson", "healthScore", "authorityScore", "missingTopics", "suggestedContent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: seo_content_gaps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_content_gaps (id, type, gap, description, priority, "clusterId", "sourceUrl", "createdAt") FROM stdin;
\.


--
-- Data for Name: seo_ctr_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_ctr_reports (id, "pageId", url, "currentTitle", "currentDescription", "avgPosition", impressions, clicks, ctr, "expectedCtr", "suggestedTitlesJson", "suggestedDescsJson", "ctrImprovementScore", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: seo_entities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_entities (id, type, name, description, aliases, sitewide, "pagesJson", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: seo_internal_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_internal_links (id, "fromPageId", "toPageId", "anchorText", url, "isBroken", "isSuggested", "createdAt") FROM stdin;
\.


--
-- Data for Name: seo_issues; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_issues (id, "pageType", "pageId", url, type, severity, description, suggestion, "isFixed", "fixedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: seo_keyword_opportunities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_keyword_opportunities (id, keyword, "pageId", url, "currentPosition", impressions, clicks, ctr, "positionBucket", "opportunityScore", "trafficOpportunity", "recommendationsJson", "dataSource", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: seo_pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_pages (id, "pageType", "pageId", url, title, "metaTitle", "metaDescription", h1, "headingsJson", "wordCount", "readabilityScore", "keywordDensityJson", "internalLinksCount", "externalLinksCount", "imagesCount", "imagesWithAlt", "hasFaq", "hasSchema", "schemaTypes", "contentScore", "technicalScore", "entityScore", "internalLinkScore", "schemaScore", "ctrScore", "overallScore", "issuesJson", "recommendationsJson", "isIndexed", "isOrphan", "lastAnalyzed", "createdAt", "updatedAt") FROM stdin;
cmq189v17002q7wv3kdu8o6e0	page	cmq17tlcu00007wv3kebcwj61	/	Home	karmakoders – Premium AI Business Portfolio	We build premium, scalable, and immersive web platforms powered by advanced AI.	\N	[]	0	0	{}	0	0	0	0	f	t	Organization	40	70	0	0	70	40	39	[{"type":"short_meta_desc","severity":"important","description":"Meta description is too short (79 chars).","suggestion":"Expand meta description to 150–160 characters."},{"type":"missing_h1","severity":"critical","description":"Page has no H1 heading.","suggestion":"Add a single, keyword-rich H1 heading."},{"type":"thin_content","severity":"critical","description":"Content is very thin (0 words).","suggestion":"Expand content to at least 600–800 words for better ranking."},{"type":"low_readability","severity":"recommended","description":"Readability score is low (0/100).","suggestion":"Use shorter sentences and simpler words to improve readability."}]	[{"type":"faq","title":"Add FAQ Section","content":"Q: What is home?\\nA: Home refers to home solutions that help businesses achieve their digital goals. At Karmakoders, we specialize in delivering high-quality home tailored to your specific needs.\\n\\nQ: How much does home cost?\\nA: The cost of home varies based on project scope and requirements. Contact Karmakoders for a free consultation and customized quote.\\n\\nQ: Why choose Karmakoders for home?\\nA: Karmakoders has expertise in home with a proven track record of successful projects. We combine technical excellence with creative problem-solving to deliver exceptional results.\\n\\nQ: How long does home take?\\nA: Timeline for home projects varies based on complexity. A typical project takes 2–8 weeks. We provide a detailed timeline during our initial consultation.\\n\\nQ: Do you offer home for small businesses?\\nA: Yes! Karmakoders offers home solutions for businesses of all sizes, from startups to enterprise. We tailor our approach to your budget and goals.","priority":"important"},{"type":"content","title":"Content Improvement Plan","content":"1. Expand content to at least 800 words. Currently 0 words — thin content ranks poorly.\\n2. Add an FAQ section with 5–8 questions about \\"home\\" to capture long-tail search intent.\\n3. Add 3–5 internal links to related pages on your site to distribute link equity.\\n4. Improve readability: use shorter sentences, bullet points, and simpler language (target Grade 8 reading level).\\n5. Add structured data schema (JSON-LD) to help Google understand your content and enable rich results.\\n6. Include \\"home\\" in your H2 and H3 subheadings to reinforce topical relevance.\\n7. Use variations of \\"home\\" naturally throughout the content to avoid keyword stuffing while maintaining relevance.\\n8. Add author bio and date to signal E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).\\n9. Include statistics, data, or case studies to add credibility and increase dwell time.","priority":"important"},{"type":"schema","title":"Add Structured Data","content":"Add FAQ Schema, Organization Schema, and Service Schema to enable rich results in Google Search.","priority":"important"},{"type":"eeat","title":"Improve E-E-A-T Signals","content":"1. Add a clear author byline with professional bio and credentials.\\n2. Include a publication and last-updated date on all content.\\n3. Add references and citations to authoritative external sources.\\n4. Display client testimonials, case studies, or reviews on service pages.\\n5. Add team/founder page with detailed professional background.\\n6. Link to your social media profiles and industry associations.\\n7. Display awards, certifications, or press mentions.\\n8. Add a detailed About page explaining your company's expertise and mission.","priority":"recommended"}]	t	f	2026-06-05 17:59:01.186	2026-06-05 17:58:34.076	2026-06-05 17:59:01.195
cmq18c1q300567wv35uyznut4	page	cmq17tldu00017wv3uc9toj00	/portfolio	Portfolio	Portfolio | karmakoders	Transforming visions into digital reality - our selected works and case studies.	\N	[]	0	0	{}	0	0	0	0	f	f	\N	40	70	0	20	0	40	35	[{"type":"short_meta_title","severity":"important","description":"Meta title is too short (23 chars).","suggestion":"Expand meta title to 50–60 characters for better visibility."},{"type":"short_meta_desc","severity":"important","description":"Meta description is too short (80 chars).","suggestion":"Expand meta description to 150–160 characters."},{"type":"missing_h1","severity":"critical","description":"Page has no H1 heading.","suggestion":"Add a single, keyword-rich H1 heading."},{"type":"thin_content","severity":"critical","description":"Content is very thin (0 words).","suggestion":"Expand content to at least 600–800 words for better ranking."},{"type":"low_readability","severity":"recommended","description":"Readability score is low (0/100).","suggestion":"Use shorter sentences and simpler words to improve readability."}]	[{"type":"faq","title":"Add FAQ Section","content":"Q: What is portfolio?\\nA: Portfolio refers to portfolio solutions that help businesses achieve their digital goals. At Karmakoders, we specialize in delivering high-quality portfolio tailored to your specific needs.\\n\\nQ: How much does portfolio cost?\\nA: The cost of portfolio varies based on project scope and requirements. Contact Karmakoders for a free consultation and customized quote.\\n\\nQ: Why choose Karmakoders for portfolio?\\nA: Karmakoders has expertise in portfolio with a proven track record of successful projects. We combine technical excellence with creative problem-solving to deliver exceptional results.\\n\\nQ: How long does portfolio take?\\nA: Timeline for portfolio projects varies based on complexity. A typical project takes 2–8 weeks. We provide a detailed timeline during our initial consultation.\\n\\nQ: Do you offer portfolio for small businesses?\\nA: Yes! Karmakoders offers portfolio solutions for businesses of all sizes, from startups to enterprise. We tailor our approach to your budget and goals.","priority":"important"},{"type":"content","title":"Content Improvement Plan","content":"1. Expand content to at least 800 words. Currently 0 words — thin content ranks poorly.\\n2. Add an FAQ section with 5–8 questions about \\"portfolio\\" to capture long-tail search intent.\\n3. Add 3–5 internal links to related pages on your site to distribute link equity.\\n4. Improve readability: use shorter sentences, bullet points, and simpler language (target Grade 8 reading level).\\n5. Add structured data schema (JSON-LD) to help Google understand your content and enable rich results.\\n6. Include \\"portfolio\\" in your H2 and H3 subheadings to reinforce topical relevance.\\n7. Use variations of \\"portfolio\\" naturally throughout the content to avoid keyword stuffing while maintaining relevance.\\n8. Add author bio and date to signal E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).\\n9. Include statistics, data, or case studies to add credibility and increase dwell time.","priority":"important"},{"type":"schema","title":"Add Structured Data","content":"Add FAQ Schema, Organization Schema, and Service Schema to enable rich results in Google Search.","priority":"important"},{"type":"eeat","title":"Improve E-E-A-T Signals","content":"1. Add a clear author byline with professional bio and credentials.\\n2. Include a publication and last-updated date on all content.\\n3. Add references and citations to authoritative external sources.\\n4. Display client testimonials, case studies, or reviews on service pages.\\n5. Add team/founder page with detailed professional background.\\n6. Link to your social media profiles and industry associations.\\n7. Display awards, certifications, or press mentions.\\n8. Add a detailed About page explaining your company's expertise and mission.","priority":"recommended"}]	t	f	2026-06-05 18:00:16.057	2026-06-05 18:00:16.059	2026-06-05 18:00:16.059
\.


--
-- Data for Name: seo_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_reports (id, type, title, "summaryJson", "createdAt") FROM stdin;
\.


--
-- Data for Name: seo_schema; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_schema (id, "pageType", "pageId", "schemaType", "schemaJson", "isValid", "errorsJson", "isApplied", "createdAt", "updatedAt") FROM stdin;
cmq18aftu00357wv3a19411rg	page	cmq17tlcu00007wv3kebcwj61	Organization	{"@context":"https://schema.org","@type":"Organization","name":"Karmakoders","url":"https://karmakoders.com","description":"KarmaKoders is an elite web development and SEO consulting agency."}	t	\N	t	2026-06-05 17:59:01.026	2026-06-05 17:59:01.026
\.


--
-- Data for Name: seo_search_console; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seo_search_console (id, "fetchedAt", "dateRange", "totalClicks", "totalImpressions", "avgCtr", "avgPosition", "topPagesJson", "topQueriesJson", "rankingDropsJson", "cannibalizationJson", "lowCtrPagesJson", connected, "siteUrl") FROM stdin;
cmpydms4l00016kv3z1dqulcw	2026-06-03 18:05:16.389	last_30_days	0	0	0	0	\N	\N	\N	\N	\N	f	\N
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: ContactSubmission ContactSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactSubmission"
    ADD CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY (id);


--
-- Name: JobApplication JobApplication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobApplication"
    ADD CONSTRAINT "JobApplication_pkey" PRIMARY KEY (id);


--
-- Name: JobOpening JobOpening_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobOpening"
    ADD CONSTRAINT "JobOpening_pkey" PRIMARY KEY (id);


--
-- Name: NewsletterSubscriber NewsletterSubscriber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsletterSubscriber"
    ADD CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY (id);


--
-- Name: Page Page_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Page"
    ADD CONSTRAINT "Page_pkey" PRIMARY KEY (id);


--
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: Section Section_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: SiteConfig SiteConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SiteConfig"
    ADD CONSTRAINT "SiteConfig_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: seo_audits seo_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_audits
    ADD CONSTRAINT seo_audits_pkey PRIMARY KEY (id);


--
-- Name: seo_automation_logs seo_automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_automation_logs
    ADD CONSTRAINT seo_automation_logs_pkey PRIMARY KEY (id);


--
-- Name: seo_brand seo_brand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_brand
    ADD CONSTRAINT seo_brand_pkey PRIMARY KEY (id);


--
-- Name: seo_clusters seo_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_clusters
    ADD CONSTRAINT seo_clusters_pkey PRIMARY KEY (id);


--
-- Name: seo_content_gaps seo_content_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_content_gaps
    ADD CONSTRAINT seo_content_gaps_pkey PRIMARY KEY (id);


--
-- Name: seo_ctr_reports seo_ctr_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_ctr_reports
    ADD CONSTRAINT seo_ctr_reports_pkey PRIMARY KEY (id);


--
-- Name: seo_entities seo_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_entities
    ADD CONSTRAINT seo_entities_pkey PRIMARY KEY (id);


--
-- Name: seo_internal_links seo_internal_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_internal_links
    ADD CONSTRAINT seo_internal_links_pkey PRIMARY KEY (id);


--
-- Name: seo_issues seo_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_issues
    ADD CONSTRAINT seo_issues_pkey PRIMARY KEY (id);


--
-- Name: seo_keyword_opportunities seo_keyword_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_keyword_opportunities
    ADD CONSTRAINT seo_keyword_opportunities_pkey PRIMARY KEY (id);


--
-- Name: seo_pages seo_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_pages
    ADD CONSTRAINT seo_pages_pkey PRIMARY KEY (id);


--
-- Name: seo_reports seo_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_reports
    ADD CONSTRAINT seo_reports_pkey PRIMARY KEY (id);


--
-- Name: seo_schema seo_schema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_schema
    ADD CONSTRAINT seo_schema_pkey PRIMARY KEY (id);


--
-- Name: seo_search_console seo_search_console_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_search_console
    ADD CONSTRAINT seo_search_console_pkey PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: JobOpening_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "JobOpening_slug_key" ON public."JobOpening" USING btree (slug);


--
-- Name: NewsletterSubscriber_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON public."NewsletterSubscriber" USING btree (email);


--
-- Name: Page_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Page_slug_key" ON public."Page" USING btree (slug);


--
-- Name: Post_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Post_slug_key" ON public."Post" USING btree (slug);


--
-- Name: Project_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_slug_key" ON public."Project" USING btree (slug);


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: SiteConfig_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SiteConfig_key_key" ON public."SiteConfig" USING btree (key);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: seo_clusters_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX seo_clusters_slug_key ON public.seo_clusters USING btree (slug);


--
-- Name: seo_internal_links_fromPageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seo_internal_links_fromPageId_idx" ON public.seo_internal_links USING btree ("fromPageId");


--
-- Name: seo_internal_links_toPageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seo_internal_links_toPageId_idx" ON public.seo_internal_links USING btree ("toPageId");


--
-- Name: seo_issues_isFixed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seo_issues_isFixed_idx" ON public.seo_issues USING btree ("isFixed");


--
-- Name: seo_issues_pageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seo_issues_pageId_idx" ON public.seo_issues USING btree ("pageId");


--
-- Name: seo_issues_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seo_issues_severity_idx ON public.seo_issues USING btree (severity);


--
-- Name: seo_pages_pageType_pageId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "seo_pages_pageType_pageId_key" ON public.seo_pages USING btree ("pageType", "pageId");


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobApplication JobApplication_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JobApplication"
    ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."JobOpening"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Section Section_pageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Section"
    ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES public."Page"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 4BTWSfLbh5v1gnpRF6qpsPR13AZUWbGaMIBVA3kLT8w22IQjnLPmnJDBIRbX7Pm

