import bcrypt from "bcrypt";

bcrypt.hash("test1234", 10).then((hash) => {
  console.log(hash);
});