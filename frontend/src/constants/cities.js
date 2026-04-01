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

export const DISTRICTS_BY_CITY = {
  Алматы: [
    { value: "0", label: "Район 0" },
    { value: "1", label: "Район 1" },
    { value: "2", label: "Район 2" },
    { value: "3", label: "Район 3" },
    { value: "4", label: "Район 4" },
    { value: "5", label: "Район 5" },
    { value: "6", label: "Район 6" },
    { value: "7", label: "Район 7" },
  ],
  Астана: [
    { value: "Алматы р-н", label: "Алматы р-н" },
    { value: "Есильский р-н", label: "Есильский р-н" },
    { value: "Нура р-н", label: "Нура р-н" },
    { value: "р-н Байконур", label: "р-н Байконур" },
    { value: "Сарайшык р-н", label: "Сарайшык р-н" },
    { value: "Сарыарка р-н", label: "Сарыарка р-н" },
  ],
};
