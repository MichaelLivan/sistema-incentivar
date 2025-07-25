@@ .. @@
   is_launched BOOLEAN DEFAULT FALSE,
   launched_at TIMESTAMP,
   launched_by UUID REFERENCES users(id),
+  confirmed_by UUID REFERENCES users(id),
   created_at TIMESTAMP DEFAULT NOW()
 );