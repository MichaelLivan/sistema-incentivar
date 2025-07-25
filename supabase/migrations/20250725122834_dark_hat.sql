@@ .. @@
CREATE POLICY "Admins/Coordinators/Financeiro can manage sessions in their sector" ON sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND
-      (users.type LIKE 'adm-%' OR users.type LIKE 'coordenacao-%' OR users.type LIKE 'financeiro-%') AND
-      (users.sector = (SELECT sector FROM patients WHERE patients.id = patient_id) OR users.type = 'adm-geral')
+      (
+        (users.type LIKE 'adm-%') OR
+        (
+          (users.type LIKE 'coordenacao-%' OR users.type LIKE 'financeiro-%') AND
+          users.sector = (SELECT sector FROM patients WHERE patients.id = patient_id)
+        )
+      )
    )
  );