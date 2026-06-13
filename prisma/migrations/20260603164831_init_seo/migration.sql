-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "seoMeta" TEXT,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "category" TEXT,
    "author" TEXT,
    "type" TEXT NOT NULL DEFAULT 'blog',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "seoMeta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOpening" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Full-time',
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "portfolio" TEXT,
    "cvUrl" TEXT NOT NULL,
    "coverLetter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_pages" (
    "id" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "h1" TEXT,
    "headingsJson" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "readabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keywordDensityJson" TEXT,
    "internalLinksCount" INTEGER NOT NULL DEFAULT 0,
    "externalLinksCount" INTEGER NOT NULL DEFAULT 0,
    "imagesCount" INTEGER NOT NULL DEFAULT 0,
    "imagesWithAlt" INTEGER NOT NULL DEFAULT 0,
    "hasFaq" BOOLEAN NOT NULL DEFAULT false,
    "hasSchema" BOOLEAN NOT NULL DEFAULT false,
    "schemaTypes" TEXT,
    "contentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "technicalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "internalLinkScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "schemaScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctrScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuesJson" TEXT,
    "recommendationsJson" TEXT,
    "isIndexed" BOOLEAN NOT NULL DEFAULT true,
    "isOrphan" BOOLEAN NOT NULL DEFAULT false,
    "lastAnalyzed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_entities" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "aliases" TEXT,
    "sitewide" BOOLEAN NOT NULL DEFAULT false,
    "pagesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_clusters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pillarPageId" TEXT,
    "childPagesJson" TEXT,
    "keywords" TEXT,
    "topicsJson" TEXT,
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "authorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingTopics" TEXT,
    "suggestedContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_audits" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "indexedPages" INTEGER NOT NULL DEFAULT 0,
    "nonIndexedPages" INTEGER NOT NULL DEFAULT 0,
    "brokenPages" INTEGER NOT NULL DEFAULT 0,
    "brokenLinks" INTEGER NOT NULL DEFAULT 0,
    "missingTitles" INTEGER NOT NULL DEFAULT 0,
    "duplicateTitles" INTEGER NOT NULL DEFAULT 0,
    "missingDescriptions" INTEGER NOT NULL DEFAULT 0,
    "duplicateDescriptions" INTEGER NOT NULL DEFAULT 0,
    "missingH1" INTEGER NOT NULL DEFAULT 0,
    "multipleH1" INTEGER NOT NULL DEFAULT 0,
    "missingAlt" INTEGER NOT NULL DEFAULT 0,
    "orphanPages" INTEGER NOT NULL DEFAULT 0,
    "missingSchema" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "technicalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuesSummaryJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'complete',

    CONSTRAINT "seo_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_internal_links" (
    "id" TEXT NOT NULL,
    "fromPageId" TEXT NOT NULL,
    "toPageId" TEXT NOT NULL,
    "anchorText" TEXT,
    "url" TEXT NOT NULL,
    "isBroken" BOOLEAN NOT NULL DEFAULT false,
    "isSuggested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_internal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_schema" (
    "id" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "schemaType" TEXT NOT NULL,
    "schemaJson" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "errorsJson" TEXT,
    "isApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_schema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_reports" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'weekly',
    "title" TEXT NOT NULL,
    "summaryJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_issues" (
    "id" TEXT NOT NULL,
    "pageType" TEXT,
    "pageId" TEXT,
    "url" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "fixedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_keyword_opportunities" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "pageId" TEXT,
    "url" TEXT,
    "currentPosition" DOUBLE PRECISION,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionBucket" TEXT,
    "opportunityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trafficOpportunity" INTEGER NOT NULL DEFAULT 0,
    "recommendationsJson" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'search_console',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_keyword_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_ctr_reports" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "url" TEXT NOT NULL,
    "currentTitle" TEXT,
    "currentDescription" TEXT,
    "avgPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedCtr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suggestedTitlesJson" TEXT,
    "suggestedDescsJson" TEXT,
    "ctrImprovementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_ctr_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_content_gaps" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "gap" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "clusterId" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_content_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_brand" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "businessName" TEXT,
    "tagline" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "founderName" TEXT,
    "founderTitle" TEXT,
    "founderBio" TEXT,
    "founderImage" TEXT,
    "servicesJson" TEXT,
    "locationsJson" TEXT,
    "socialProfilesJson" TEXT,
    "awardsJson" TEXT,
    "certificationsJson" TEXT,
    "reviewsJson" TEXT,
    "industryKeywords" TEXT,
    "brandScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consistencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "schemaJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_search_console" (
    "id" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateRange" TEXT NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "avgCtr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topPagesJson" TEXT,
    "topQueriesJson" TEXT,
    "rankingDropsJson" TEXT,
    "cannibalizationJson" TEXT,
    "lowCtrPagesJson" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "siteUrl" TEXT,

    CONSTRAINT "seo_search_console_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_automation_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "pageId" TEXT,
    "pageType" TEXT,
    "url" TEXT,
    "before" TEXT,
    "after" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "triggeredBy" TEXT NOT NULL DEFAULT 'auto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "SiteConfig_key_key" ON "SiteConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JobOpening_slug_key" ON "JobOpening"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "seo_pages_pageType_pageId_key" ON "seo_pages"("pageType", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "seo_clusters_slug_key" ON "seo_clusters"("slug");

-- CreateIndex
CREATE INDEX "seo_internal_links_fromPageId_idx" ON "seo_internal_links"("fromPageId");

-- CreateIndex
CREATE INDEX "seo_internal_links_toPageId_idx" ON "seo_internal_links"("toPageId");

-- CreateIndex
CREATE INDEX "seo_issues_pageId_idx" ON "seo_issues"("pageId");

-- CreateIndex
CREATE INDEX "seo_issues_severity_idx" ON "seo_issues"("severity");

-- CreateIndex
CREATE INDEX "seo_issues_isFixed_idx" ON "seo_issues"("isFixed");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
