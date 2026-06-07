import {glob} from 'astro/loaders';
import {z} from 'astro/zod';
import {defineCollection} from 'astro:content';

/*
 * Schemas.
 */

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional()
});

/*
 * Config.
 */

const blog = defineCollection({
  loader: glob({base: './src/content/blog', pattern: '**/*.{md,mdx}'}),
  schema: blogSchema
});

export const collections = {blog};
