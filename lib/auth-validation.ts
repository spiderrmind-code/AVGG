export type RegisterInput = {
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeRole(value?: string) {
  if (!value) return "customer";
  const normalized = value.toLowerCase();
  return normalized === "admin" || normalized === "seller" ? normalized : "customer";
}

export function validateRegisterInput(input: RegisterInput): ValidationResult {
  const errors: string[] = [];

  if (!input.name?.trim()) errors.push("El nombre es obligatorio");
  if (!input.lastName?.trim()) errors.push("El apellido es obligatorio");
  if (!input.email?.trim()) errors.push("El email es obligatorio");
  if (!input.password?.trim()) errors.push("La contraseña es obligatoria");

  const email = input.email?.trim().toLowerCase() ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("El email debe tener un formato válido");
  }

  if (input.password && input.password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }

  if (input.password && !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(input.password)) {
    errors.push("La contraseña debe incluir mayúscula, número y símbolo");
  }

  if (input.password && input.confirmPassword && input.password !== input.confirmPassword) {
    errors.push("Las contraseñas deben coincidir");
  }

  return { valid: errors.length === 0, errors };
}
