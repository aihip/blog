import rss from '@astrojs/rss';
import {getPosts} from '../lib/posts';
export async function GET(){return rss({title:'Leon · 赚钱与生活', description:'记录赚钱与 SEO 的探索、赚点小钱的尝试，以及关于认知与生活的思考。',site:'https://blog.pheth.com',items:(await getPosts()).map(p=>({title:p.data.title,description:p.data.description,pubDate:p.data.date,link:`/posts/${p.id}/`})),customData:'<language>zh-cn</language>'});}
