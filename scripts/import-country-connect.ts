import { readFileSync } from 'fs';
import { db } from '../server/db';
import { websitePages } from '../shared/schema';

interface SiteExtraction {
  siteName: string;
  baseUrl: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    white: string;
  };
  logo: {
    url: string;
    localPath: string;
  };
  pages: Array<{
    slug: string;
    title: string;
    htmlFile: string;
    metaDescription: string;
  }>;
}

async function importCountryConnectPages() {
  try {
    console.log('🔄 Starting Country Connect page import...\n');

    const extraction: SiteExtraction = JSON.parse(
      readFileSync('/tmp/site-extraction.json', 'utf-8')
    );

    const organizationId = 4; // Country Connect organization

    for (const pageData of extraction.pages) {
      console.log(`📄 Importing: ${pageData.slug}`);

      const htmlContent = readFileSync(pageData.htmlFile, 'utf-8');

      // Normalize slug - remove leading slash for storage, will be added back in routes
      const slug = pageData.slug === '/' ? 'home' : pageData.slug.replace('/', '');

      const existingPage = await db.query.websitePages.findFirst({
        where: (pages, { eq, and }) => 
          and(
            eq(pages.organizationId, organizationId),
            eq(pages.slug, slug)
          )
      });

      if (existingPage) {
        console.log(`  ↪ Updating existing page: ${slug}`);
        await db
          .update(websitePages)
          .set({
            title: pageData.title,
            metaDescription: pageData.metaDescription,
            htmlContent,
            brandColors: extraction.brandColors,
            images: { logo: extraction.logo },
            updatedAt: new Date(),
          })
          .where((pages) => pages.id.equals(existingPage.id));
      } else {
        console.log(`  ✅ Creating new page: ${slug}`);
        await db.insert(websitePages).values({
          organizationId,
          slug,
          title: pageData.title,
          metaDescription: pageData.metaDescription,
          htmlContent,
          brandColors: extraction.brandColors,
          images: { logo: extraction.logo },
          status: 'draft',
        });
      }
    }

    console.log('\n✅ All pages imported successfully!');
    console.log(`📊 Total pages: ${extraction.pages.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing pages:', error);
    process.exit(1);
  }
}

importCountryConnectPages();
