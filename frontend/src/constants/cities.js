export const CITIES = [
  { name: "Алматы", slug: "almaty" },
  { name: "Астана", slug: "astana" },
  { name: "Шымкент", slug: "shymkent" },
];

export const CITY_NAMES = CITIES.map((city) => city.name);

export const CITY_BY_SLUG = CITIES.reduce((acc, city) => {
  acc[city.slug] = city.name;
  return acc;
}, {});

export const CITY_NAME_TO_SLUG = CITIES.reduce((acc, city) => {
  acc[city.name] = city.slug;
  return acc;
}, {});
