import rss from '@astrojs/rss';
import {getCollection} from 'astro:content';

import {siteDescription, siteTitle} from '../site';

export async function GET(context) {
  const posts = await getCollection('blog');

  return rss({
    title: siteTitle,
    description: siteDescription,
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`
    }))
  });
}
