export type Restaurant = {
  id: string
  name: string
  location: string
  cuisine: string
}

export type Visit = {
  id: string
  restaurantId: string
  date: string
  foodRating?: number
  serviceRating?: number
  ambienceRating?: number
  valueRating?: number
  rating: number
  note: string
}

export type RestaurantInput = {
  name: string
  location: string
  address?: string
  cuisine: string
}

export type VisitInput = {
  date: string
  foodRating: number
  serviceRating: number
  ambienceRating: number
  valueRating: number
  note: string
}