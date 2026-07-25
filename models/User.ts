
// Tipos de usuario compatibles con MongoClient (sin Mongoose).
// No crea conexión ni modelo — es solo tipado para usar con getDb().collection("users").
 
export type UserRole = "customer" | "seller" | "admin";
 
export interface IUser {
  _id?: string;
  name?: string;
  email: string;
  password: string;
  role: UserRole;
  sellerStatus?: "pending" | "approved" | "rejected";
  createdAt: Date;
}
 