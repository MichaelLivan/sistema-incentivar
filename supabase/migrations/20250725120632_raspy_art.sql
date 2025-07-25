@@ .. @@
     is_confirmed BOOLEAN DEFAULT FALSE,
     confirmed_at TIMESTAMP,
+    confirmed_by UUID REFERENCES users(id),
     is_approved BOOLEAN DEFAULT FALSE,