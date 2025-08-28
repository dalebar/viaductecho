# Viaduct Echo News Aggregation System

An automated news aggregation and publishing system that monitors local Stockport news sources and automatically publishes summarized articles to a Jekyll blog.

## System Overview

![Workflow Diagram](assets/images/flow-diagram.png)

Currently the system operates through two parallel processing pipelines in n8n that monitor BBC Manchester and Manchester Evening News (MEN) RSS feeds for Stockport-related content. The objective is to expand to include more news sources.

## Features

- **Automated RSS Monitoring**: Hourly checks of BBC Manchester and MEN news feeds
- **Content Filtering**: Identifies articles containing "Stockport" in titles or content
- **Image Extraction**: Pulls featured images from original articles using Open Graph meta tags
- **Full Text Extraction**: Parses HTML to extract complete article content
- **AI Summarization**: Uses AI assistant to create concise 200-word summaries
- **Jekyll Integration**: Automatically creates properly formatted blog posts
- **GitHub Publishing**: Commits posts directly to GitHub Pages repository

## Workflow Components

### Current Data Sources (to be expanded)
- **BBC Manchester RSS**: `https://feeds.bbci.co.uk/news/england/manchester/rss.xml`
- **Manchester Evening News RSS**: `https://www.manchestereveningnews.co.uk/news/greater-manchester-news/?service=rss`

### Processing Pipeline ([n8n](https://n8n.io/))
1. **Schedule Trigger**: Runs every hour to check for new articles
2. **RSS Feed Parsing**: Extracts article metadata (title, link, summary, date)
3. **Content Filtering**: Python script identifies Stockport-related articles
4. **Data Preservation**: Set nodes preserve original RSS metadata
5. **HTML Extraction**: Downloads full article HTML content
6. **Data Merging**: Combines RSS metadata with HTML content
7. **Image Extraction**: Parses HTML for Open Graph images
8. **Text Extraction**: Extracts article body content from HTML
9. **AI Summarization**: Creates 200-word summaries via message model
10. **Jekyll Post Creation**: Formats content as Jekyll markdown with YAML front matter
11. **GitHub Commit**: Publishes posts to repository via GitHub API

### Output Format

Each article becomes a Jekyll post with:
- **YAML Front Matter**: Title, author, date, categories, image, description
- **AI Summary**: Concise 200-word article summary
- **Source Attribution**: Links back to original article
- **Automatic Metadata**: Publication timestamps and categorization

## Technical Implementation

- **Platform**: n8n workflow automation
- **Runtime**: Hourly scheduled execution
- **Content Processing**: Python scripts for filtering and text extraction
- **AI Integration**: Message model for content summarization
- **Publication**: GitHub API for Jekyll site updates
- **Live Site**: https://viaductecho.info

## Known Limitations

- No duplicate detection mechanism
- Dependent on stable HTML structure from news sources
- AI summarization costs accumulate with usage
- Limited error handling for failed extractions
- No content quality validation for AI summaries

## Future Improvements

- Implement duplicate article detection
- Add error handling and fallback mechanisms
- Monitor and optimize AI usage costs
- Enhance text extraction robustness
- Add content quality validation
```
