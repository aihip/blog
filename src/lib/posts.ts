import { getCollection } from 'astro:content';
export const getPosts = async () => (await getCollection('posts', ({data}) => !data.draft)).sort((a,b) => b.data.date.valueOf() - a.data.date.valueOf());
export const dateLabel = (date: Date) => date.toISOString().slice(0,10).replaceAll('-', '.');
