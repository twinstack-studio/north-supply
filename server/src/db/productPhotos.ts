/**
 * Curated product photography from Unsplash.
 *
 * Each entry hotlinks images.unsplash.com — Unsplash's own CDN and the way
 * they ask to be embedded — with sizing params appended. Photos are all under
 * the Unsplash License (free commercial use, attribution not required but
 * given here anyway and surfaced on the product page).
 *
 * Regenerate or extend by hand: the short id is the tail of the unsplash.com
 * /photos/<id> URL. Unsplash+ (plus.unsplash.com) photos cannot be hotlinked
 * and must not be added here.
 *
 * Products absent from this map fall back to the generated SVG placeholders in
 * lib/productImage.ts.
 */

export interface StockPhoto {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

export const PRODUCT_PHOTOS: Record<string, StockPhoto[]> = {
  'atlas-heavyweight-hoodie': [
    {
      url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man wearing grey pullover hoodie',
      credit: 'Jannes Jacobs',
      creditUrl: 'https://unsplash.com/@jannesjacobs',
    },
    {
      url: 'https://images.unsplash.com/photo-1611817757591-c3f345024273?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in gray hoodie standing in front of white building during daytime',
      credit: 'LOGAN WEAVER | @LGNWVR',
      creditUrl: 'https://unsplash.com/@lgnwvr',
    },
    {
      url: 'https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'men wearing a grey hoodie jacket leaning in a wall during daytime',
      credit: 'The Ian',
      creditUrl: 'https://unsplash.com/@theian20',
    },
  ],
  'range-zip-hoodie': [
    {
      url: 'https://images.unsplash.com/photo-1579572331145-5e53b299c64e?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'person in black hoodie jacket',
      credit: 'Philipp Lansing',
      creditUrl: 'https://unsplash.com/@philipp_lansing',
    },
    {
      url: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'person in brown hoodie and black pants standing on staircase',
      credit: 'Ali Saadat',
      creditUrl: 'https://unsplash.com/@camsaadat',
    },
    {
      url: 'https://images.unsplash.com/photo-1517942420142-6a296f9ee4b1?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man wearing brown hoodie sitting near tennis net',
      credit: 'Hunter Newton',
      creditUrl: 'https://unsplash.com/@r7studios',
    },
  ],
  'depot-crewneck': [
    {
      url: 'https://images.unsplash.com/photo-1499971442178-8c10fdf5f6ac?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'black crew-neck t-shirt on clothes hanger',
      credit: 'Tobias van Schneider',
      creditUrl: 'https://unsplash.com/@vanschneider',
    },
    {
      url: 'https://images.unsplash.com/photo-1499971856191-1a420a42b498?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'black sweatshirts on plastic hangers',
      credit: 'Tobias van Schneider',
      creditUrl: 'https://unsplash.com/@vanschneider',
    },
    {
      url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman wearing orange crew-neck sweatshirt standing while putting right hand on her head',
      credit: 'Matas Katinas',
      creditUrl: 'https://unsplash.com/@matuxee',
    },
  ],
  'grid-quarter-zip': [
    {
      url: 'https://images.unsplash.com/photo-1773240306707-2a07fc569fde?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'Man in outdoor gear stands before a waterfall',
      credit: 'LOGAN WEAVER | @LGNWVR',
      creditUrl: 'https://unsplash.com/@lgnwvr',
    },
    {
      url: 'https://images.unsplash.com/photo-1578681994827-a9776963799c?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman wearing black with white printed crew-neck sweatshirt standing while facing her left side',
      credit: 'JUSTIN BUISSON',
      creditUrl: 'https://unsplash.com/@justinbuisson',
    },
    {
      url: 'https://images.unsplash.com/photo-1521567097888-2c5fc40a8660?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman inserting her both hands in blue denim hot shorts pockets outdoors',
      credit: 'Joshua Rawson-Harris',
      creditUrl: 'https://unsplash.com/@joshrh19',
    },
  ],
  'foundry-boxy-tee': [
    {
      url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'white crew neck t-shirt',
      credit: 'Haryo Setyadi',
      creditUrl: 'https://unsplash.com/@uyk',
    },
    {
      url: 'https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man wearing white crew-neck shirt and black denim jeans with hands in pocket',
      credit: 'Brando Makes Branding',
      creditUrl: 'https://unsplash.com/@brandomakesbranding',
    },
    {
      url: 'https://images.unsplash.com/photo-1618677603286-0ec56cb6e1b5?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'white crew neck t-shirt',
      credit: 'Mediamodifier',
      creditUrl: 'https://unsplash.com/@mediamodifier',
    },
  ],
  'signal-long-sleeve': [
    {
      url: 'https://images.unsplash.com/photo-1618354691551-44de113f0164?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'black long sleeve shirt on white table',
      credit: 'Ryan Hoffman',
      creditUrl: 'https://unsplash.com/@ryanhoffman007',
    },
    {
      url: 'https://images.unsplash.com/photo-1618453292459-53424b66bb6a?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in black crew neck t-shirt standing near brick wall',
      credit: 'Sven Ciupka',
      creditUrl: 'https://unsplash.com/@svenciupkab',
    },
    {
      url: 'https://images.unsplash.com/photo-1627225925683-1da7021732ea?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in black crew neck t-shirt',
      credit: 'Bao Bao',
      creditUrl: 'https://unsplash.com/@baobao_2411',
    },
  ],
  'meridian-pocket-tee': [
    {
      url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'black crew neck t-shirt',
      credit: 'Ryan Hoffman',
      creditUrl: 'https://unsplash.com/@ryanhoffman007',
    },
    {
      url: 'https://images.unsplash.com/photo-1553859943-a02c5418b798?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man wearing white crew-neck t-shirt',
      credit: 'sobhan joodi',
      creditUrl: 'https://unsplash.com/@sbhnleo',
    },
    {
      url: 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'black and white crew neck t-shirt',
      credit: 'Ryan Hoffman',
      creditUrl: 'https://unsplash.com/@ryanhoffman007',
    },
  ],
  'union-striped-tee': [
    {
      url: 'https://images.unsplash.com/photo-1600328759671-85927887458d?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman in white crew neck t-shirt',
      credit: 'Rebecca Glossop',
      creditUrl: 'https://unsplash.com/@itsbeccadesign',
    },
    {
      url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'assorted color folded shirts on wooden panel',
      credit: 'Md Salman',
      creditUrl: 'https://unsplash.com/@mohammadsalman',
    },
    {
      url: 'https://images.unsplash.com/photo-1622445275463-afa2ab738c34?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in white crew neck t-shirt standing on green grass field during daytime',
      credit: 'Mediamodifier',
      creditUrl: 'https://unsplash.com/@mediamodifier',
    },
  ],
  'wharf-chore-jacket': [
    {
      url: 'https://images.unsplash.com/photo-1594587639708-095eb3778067?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'person holding green denim jacket',
      credit: 'Toa Heftiba',
      creditUrl: 'https://unsplash.com/@heftiba',
    },
    {
      url: 'https://images.unsplash.com/photo-1608976198709-5e70a09b9ff0?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in brown jacket standing near red wall',
      credit: 'Marcel Strauß',
      creditUrl: 'https://unsplash.com/@martzzl',
    },
    {
      url: 'https://images.unsplash.com/photo-1653812564600-56291b1add3b?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a man standing next to a tree wearing a yellow jacket',
      credit: 'Sami Sadeghi',
      creditUrl: 'https://unsplash.com/@sami__sadeghi',
    },
  ],
  'harbour-shell-jacket': [
    {
      url: 'https://images.unsplash.com/photo-1624548140150-108c3287f551?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'orange zip up hoodie jacket',
      credit: 'Bulbul Ahmed',
      creditUrl: 'https://unsplash.com/@bulbul252',
    },
    {
      url: 'https://images.unsplash.com/photo-1678884399113-0a2b079a31f5?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a woman wearing a white jacket and sunglasses',
      credit: 'Reynier Carl',
      creditUrl: 'https://unsplash.com/@caarl',
    },
    {
      url: 'https://images.unsplash.com/photo-1652794121186-4fbd93701e38?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a man in a yellow and black jacket and a backpack',
      credit: 'Old Youth',
      creditUrl: 'https://unsplash.com/@oldyouth',
    },
  ],
  'vector-bomber': [
    {
      url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'A hand holding a brown bomber jacket on a white hanger against a wall',
      credit: 'Tobias Tullius',
      creditUrl: 'https://unsplash.com/@tobiastu',
    },
    {
      url: 'https://images.unsplash.com/photo-1613422448762-c13f05ae758a?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in orange and black jacket holding white ceramic mug',
      credit: 'Good Faces',
      creditUrl: 'https://unsplash.com/@goodfacesagency',
    },
    {
      url: 'https://images.unsplash.com/photo-1588011025378-15f4778d2558?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman in black coat holding her chin',
      credit: 'Samia Liamani',
      creditUrl: 'https://unsplash.com/@mialiamani',
    },
  ],
  'beacon-puffer-vest': [
    {
      url: 'https://images.unsplash.com/photo-1577910473180-55de54e7ff30?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'women\'s black leather bubble vest',
      credit: 'Liz Fitch',
      creditUrl: 'https://unsplash.com/@lizfitch',
    },
    {
      url: 'https://images.unsplash.com/photo-1644140821708-bd32b2796e39?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a woman wearing a green vest and black leggings',
      credit: 'sobhan joodi',
      creditUrl: 'https://unsplash.com/@sbhnleo',
    },
    {
      url: 'https://images.unsplash.com/photo-1549413800-6cb350ba758d?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman standing on forest during golden hour',
      credit: 'Timothy Dykes',
      creditUrl: 'https://unsplash.com/@timothycdykes',
    },
  ],
  'transit-cargo-pant': [
    {
      url: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman standing near open door',
      credit: 'Napat Saeng',
      creditUrl: 'https://unsplash.com/@napats',
    },
    {
      url: 'https://images.unsplash.com/photo-1780566759823-6ab515d86760?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'Stylish woman in oversized white tee and brown cargo pants',
      credit: 'Anton K Wibowo',
      creditUrl: 'https://unsplash.com/@antonkwibowo',
    },
    {
      url: 'https://images.unsplash.com/photo-1700676195086-81b936390de4?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a woman standing in front of a brown wall',
      credit: 'Melbin Jacob',
      creditUrl: 'https://unsplash.com/@melbinjacob',
    },
  ],
  'anchor-straight-denim': [
    {
      url: 'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'blue denim jeans on brown clothes hanger',
      credit: 'Jason Leung',
      creditUrl: 'https://unsplash.com/@ninjason',
    },
    {
      url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'person wears blue jeans',
      credit: 'Alicia Petresc',
      creditUrl: 'https://unsplash.com/@alice02',
    },
    {
      url: 'https://images.unsplash.com/photo-1475178626620-a4d074967452?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman standing wearing jeans and white top',
      credit: 'Tamara Bellis',
      creditUrl: 'https://unsplash.com/@tamarabellis',
    },
  ],
  'coast-relaxed-sweatpant': [
    {
      url: 'https://images.unsplash.com/photo-1602573991155-21f0143bb45c?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman in gray tank top and gray pants',
      credit: 'engin akyurt',
      creditUrl: 'https://unsplash.com/@enginakyurt',
    },
    {
      url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'closeup photo of person hiding his right hand in his pocket',
      credit: 'Frank Flores',
      creditUrl: 'https://unsplash.com/@frankflores',
    },
    {
      url: 'https://images.unsplash.com/photo-1588117260148-b47818741c74?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman in gray t-shirt and gray pants sitting on gray concrete bench during daytime',
      credit: 'Mike Von',
      creditUrl: 'https://unsplash.com/@thevoncomplex',
    },
  ],
  'pier-utility-short': [
    {
      url: 'https://images.unsplash.com/photo-1621496503717-095a410e1566?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in white crew neck t-shirt and green shorts standing on beach during daytime',
      credit: 'Brandon Atchison',
      creditUrl: 'https://unsplash.com/@b_atchison98',
    },
    {
      url: 'https://images.unsplash.com/photo-1629185752193-0d25bb978c04?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in black t-shirt and beige shorts standing on rock formation during daytime',
      credit: 'JUSTIN BUISSON',
      creditUrl: 'https://unsplash.com/@justinbuisson',
    },
    {
      url: 'https://images.unsplash.com/photo-1697319452360-ee47502e39f6?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a man walking down the street in shorts',
      credit: 'Mohamad Khosravi',
      creditUrl: 'https://unsplash.com/@mohamadkhosravi',
    },
  ],
  'standard-issue-cap': [
    {
      url: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'man in gray cap',
      credit: 'Ahmed Syed',
      creditUrl: 'https://unsplash.com/@shotbyraza',
    },
    {
      url: 'https://images.unsplash.com/photo-1622445275576-721325763afe?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'person in white long sleeve shirt holding white hat',
      credit: 'Mediamodifier',
      creditUrl: 'https://unsplash.com/@mediamodifier',
    },
    {
      url: 'https://images.unsplash.com/photo-1630381259916-72321f3bafe0?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman in gray jacket and blue denim jeans sitting on brown wooden chair',
      credit: 'Mediamodifier',
      creditUrl: 'https://unsplash.com/@mediamodifier',
    },
  ],
  'field-tote': [
    {
      url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'beige eco bag',
      credit: 'Kelly Sikkema',
      creditUrl: 'https://unsplash.com/@kellysikkema',
    },
    {
      url: 'https://images.unsplash.com/photo-1572196284554-4e321b0e7e0b?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'black tote bag',
      credit: 'He\'s Her Lobster',
      creditUrl: 'https://unsplash.com/@hesherlobsteruk',
    },
    {
      url: 'https://images.unsplash.com/photo-1548863227-3af567fc3b27?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'white tote bag',
      credit: 'Rahul Bhogal',
      creditUrl: 'https://unsplash.com/@rahulbhogal',
    },
  ],
  'ridge-beanie': [
    {
      url: 'https://images.unsplash.com/photo-1532073150508-0c1df022bdd1?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'selective focus photography of woman wearing red knit cap',
      credit: 'christian  ferrer',
      creditUrl: 'https://unsplash.com/@christianfer',
    },
    {
      url: 'https://images.unsplash.com/photo-1510598969022-c4c6c5d05769?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'woman wearing green knit cap and blue denim jacket',
      credit: 'Jordan Whitfield',
      creditUrl: 'https://unsplash.com/@whitfieldjordan',
    },
  ],
  'course-crew-socks-3-pack': [
    {
      url: 'https://images.unsplash.com/photo-1640026199235-c24aa417b552?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a pair of green socks laying on top of a white surface',
      credit: 'NIKHIL',
      creditUrl: 'https://unsplash.com/@vinikhill',
    },
    {
      url: 'https://images.unsplash.com/photo-1640025867572-f6b3a8410c81?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'a pair of socks laying on top of a yellow surface',
      credit: 'NIKHIL',
      creditUrl: 'https://unsplash.com/@vinikhill',
    },
    {
      url: 'https://images.unsplash.com/photo-1613151848917-80e67f421fff?auto=format&fit=crop&w=900&h=1125&q=80',
      alt: 'gray sock on white textile',
      credit: 'Nynne Schrøder',
      creditUrl: 'https://unsplash.com/@seasonsdiary',
    },
  ],
};
