import Link from 'next/link';
import ProductCard from '../components/ProductCard';
import StoreHeader from '../components/StoreHeader';
import SiteFooter from '../components/SiteFooter';
import {getActiveProducts} from '../products';
import ShopGrid from './ShopGrid';
export const dynamic='force-dynamic';
export default async function Shop(){let products=[];try{products=await getActiveProducts()}catch(e){console.error(e)}return <ShopClient products={products}/>;}
function ShopClient({products}){return <main className="ac-site"><StoreHeader products={products}/><section className="shop-hero"><span>AVANCY COLLECTIVES / 001</span><h1>THE <em>DROP.</em></h1><p>Original graphics. Heavyweight silhouettes. Pieces made to move.</p></section><section className="ac-drop" id="drop-001"><div className="ac-section-head"><div><span>{products.length} PIECES / READY TO WEAR</span><h2>SHOP ALL</h2></div><Link href="/create-yours">CREATE YOURS →</Link></div><ShopGrid products={products}/></section><SiteFooter/></main>}
