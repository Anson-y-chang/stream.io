// Authentication handler functions
export function login(db) {
  const usersCollection = db.collection("users");

  return async (req, res) => {
    try {
      const user = await usersCollection.findOne({
        email: req.body.email,
      });

      if (user) {
        if (user.password === req.body.password) {
          req.session.user_id = user._id;
          res.status(200).json({
            message: "Login successful!",
          });
        } else {
          res.status(400).json({
            message: "Password is incorrect",
          });
        }
      } else {
        return res.status(302).json({
          message:
            "There is no any account relate to this email, would you like to create one?",
        });
      }
    } catch (err) {
      console.error("Error in /login:", err);
      res.status(500).json({ error: err.message });
    }
  };
}

export function signup(db) {
  const usersCollection = db.collection("users");

  return async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({
        message: "empty input",
      });
    }

    try {
      const isUserFound = await usersCollection.findOne({
        email: req.body.email,
      });

      if (isUserFound) {
        return res.status(302).json({
          message:
            "This email has already been occupied, would you like to login?",
        });
      }

      await usersCollection.insertOne({
        email: req.body.email,
        password: req.body.password,
      });

      res.status(200).json({
        message: "Sign up successful, would you like to login?",
      });
    } catch (err) {
      console.error("Error in /sign-up:", err);
      res.status(500).json({ error: err.message });
    }
  };
}

export function logout() {
  return (req, res) => {
    req.session.destroy();
    res.status(200).json({ message: "Logout successful" });
  };
}
