export type UserInfo = {
  email: string;
  password: string;
};

export interface AuthContextType {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
}
