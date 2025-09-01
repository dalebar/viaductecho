# Viaduct Echo News Aggregation System

An automated news aggregation and publishing system that monitors multiple local Stockport news sources and automatically publishes summarized articles to a Jekyll blog with comprehensive duplicate detection and database management.

## System Overview

![Workflow Diagram](assets/images/flow-diagram.png)

The system operates through three parallel processing pipelines in n8n that monitor news sources for Stockport-related content:
- **BBC Manchester RSS Feed** - Traditional RSS parsing
- **Manchester Evening News RSS Feed** - Traditional RSS parsing  
- **Stockport Nub News** - JSON-LD extraction with full content scraping

All articles are stored in a PostgreSQL database to prevent duplicate processing and enable system scalability.

## Features

- **Multi-Source Monitoring**: Hourly checks across three different news sources
- **Intelligent Content Extraction**: 
  - RSS feed parsing for BBC and MEN
  - JSON-LD structured data extraction for Nub News
  - Full article content and image extraction
- **Content Filtering**: Identifies articles containing "Stockport" in titles or content
- **Duplicate Prevention**: PostgreSQL database tracks processed articles by URL hash
- **Database Management**: Neon-hosted PostgreSQL stores article metadata and processing state
- **AI Summarization**: Uses AI assistant to create concise 200-word summaries
- **Jekyll Integration**: Automatically creates properly formatted blog posts
- **GitHub Publishing**: Commits posts directly to GitHub Pages repository with branch control
- **Rate Limiting**: Respectful scraping with configurable delays between requests

## Database Schema

### rss_articles Table
- `id`: Auto-incrementing primary key
- `original_title`: Article headline (VARCHAR 500)
- `original_link`: Source URL (TEXT, UNIQUE)
- `original_summary`: RSS feed summary or extracted content summary (TEXT)
- `original_source`: News source identifier (VARCHAR 100)
- `original_pubdate`: Publication timestamp (TIMESTAMPTZ)
- `url_hash`: MD5 hash of URL for fast duplicate detection (VARCHAR 64, UNIQUE)
- `created_at`: Database insertion timestamp (TIMESTAMPZ)
- `processed`: Boolean flag tracking AI processing completion

## Workflow Components

### Data Sources
- **BBC Manchester RSS**: `https://feeds.bbci.co.uk/news/england/manchester/rss.xml`
- **Manchester Evening News RSS**: `https://www.manchestereveningnews.co.uk/news/greater-manchester-news/?service=rss`
- **Stockport Nub News**: `https://stockport.nub.news/news` (JSON-LD + content scraping)

### Processing Pipelines

#### BBC & MEN RSS Pipeline
1. **Schedule Trigger**: Runs every hour
2. **RSS Feed Parsing**: Extracts article metadata
3. **Content Filtering**: Python script identifies Stockport-related articles
4. **Database Duplicate Check**: Queries PostgreSQL for existing URL hashes
5. **Conditional Processing**: IF node routes new articles to processing
6. **Database Insert**: Stores new articles with parameterized SQL
7. **HTML Content Extraction**: Downloads full article content
8. **Image Extraction**: Parses HTML for featured images
9. **AI Summarization**: Creates 200-word summaries
10. **Jekyll Post Creation**: Formats as markdown with YAML front matter
11. **GitHub Publishing**: Individual commits via Loop Over Items
12. **Processing State Update**: Marks articles as processed

#### Nub News JSON-LD Pipeline  
1. **Schedule Trigger**: Runs every hour
2. **HTTP Request**: Fetches main news page
3. **HTML Extract**: Extracts JSON-LD structured data
4. **Python Processing**: Parses JSON-LD and transforms data
5. **Database Duplicate Check**: Queries for existing articles
6. **Individual Article Fetching**: HTTP requests for full content
7. **Content Extraction**: Scrapes article text and images using CSS selectors
8. **Content Merging**: Combines metadata with full article content
9. **AI Summarization**: Creates summaries from extracted content
10. **Jekyll Post Creation**: Formats posts with enhanced content
11. **Loop Processing**: Processes each article individually
12. **GitHub Publishing**: Commits with rate limiting
13. **Database State Update**: Marks as processed

### Technical Implementation Details

#### Content Extraction Selectors (Nub News)
- **Article Content**: `div.prose.max-w-none.leading-snug`
- **Featured Image**: `div.w-full.overflow-hidden img` (src attribute)
- **Meta Description**: `meta[name="description"]` (content attribute)

#### Rate Limiting Strategy
- **Main Page Requests**: 2-second delays
- **Individual Article Requests**: 1-second delays  
- **Loop Processing**: Built-in delays between items
- **GitHub API**: Managed through Loop Over Items sequential processing

#### Database Operations
- **Duplicate Detection**: MD5 URL hash with unique constraints
- **Parameterized Queries**: SQL injection protection
- **Processing State Tracking**: Boolean flags prevent redundant operations
- **Indexed Performance**: Fast lookups on url_hash and processed fields

## Output Format

Each article becomes a Jekyll post with:
- **YAML Front Matter**: Title, author, date, categories, featured image, description
- **AI Summary**: Intelligent 200-word summaries based on full content
- **Source Attribution**: Links back to original articles
- **Enhanced Metadata**: Publication timestamps, categorization, and image data

## Technical Architecture

- **Platform**: n8n workflow automation with Python scripting
- **Database**: PostgreSQL (Neon-hosted) with comprehensive indexing
- **Runtime**: Hourly scheduled execution across multiple pipelines
- **Content Processing**: CSS selector-based extraction and AI summarization
- **AI Integration**: Message model for intelligent content summarization
- **Publication**: GitHub API with branch-specific deployment
- **Live Site**: https://viaductecho.info

## Recent Enhancements

- ✅ **Multi-Source Integration**: Added Stockport Nub News with JSON-LD parsing
- ✅ **Full Content Extraction**: Comprehensive article text and image scraping
- ✅ **Enhanced Rate Limiting**: Respectful scraping across all sources
- ✅ **Loop-Based Processing**: Individual article handling with Loop Over Items
- ✅ **Advanced Selectors**: Targeted content extraction using CSS selectors
- ✅ **Improved Summarization**: AI summaries based on full article content
- ✅ **Branch-Specific Publishing**: Test deployment capability across all pipelines

## Known Limitations

- Dependent on stable HTML structure from Nub News source
- AI summarization costs scale with article volume
- Limited error handling for failed content extractions
- No content quality validation for extracted text

## Future Improvements

- Implement comprehensive error handling across all pipelines
- Add content quality validation for extracted articles
- Monitor and optimize AI usage costs with analytics
- Expand to additional local news sources
- Implement article categorization beyond Stockport filtering
- Add fallback mechanisms for changed website structures
