import rss from '@astrojs/rss';
import {getPosts} from '../lib/posts';
export async function GET(){return rss({title:'Pheth · 成年人的随想', description:'关于生活、关系、时间，以及与自己相处的片刻。',site:'https://blog.pheth.com',items:(await getPosts()).map(p=>({title:p.data.title,description:p.data.description,pubDate:p.data.date,link:`/posts/${p.id}/`})),customData:'<language>zh-cn</language>'});}
