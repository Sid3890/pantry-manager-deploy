-- Oracle reference logic for the backend's database-authoritative operations.

CREATE OR REPLACE FUNCTION match_recipe(
  p_user_id IN NUMBER,
  p_recipe_id IN NUMBER
) RETURN NUMBER
IS
  l_total NUMBER := 0;
  l_available NUMBER := 0;
  l_stock NUMBER;
BEGIN
  FOR item IN (
    SELECT ri.ingredient_id, ri.quantity_required, ri.unit
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = p_recipe_id
  ) LOOP
    l_total := l_total + 1;
    SELECT NVL(SUM(pi.quantity), 0)
      INTO l_stock
      FROM pantry_items pi
     WHERE pi.user_id = p_user_id
       AND pi.ingredient_id = item.ingredient_id
       AND pi.unit = item.unit;
    IF l_stock >= item.quantity_required THEN
      l_available := l_available + 1;
    END IF;
  END LOOP;

  IF l_total = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((l_available / l_total) * 100, 2);
END;
/

CREATE OR REPLACE PROCEDURE cook_recipe(
  p_user_id IN NUMBER,
  p_recipe_id IN NUMBER
)
IS
  l_stock NUMBER;
  l_remaining NUMBER;
  l_deduction NUMBER;
BEGIN
  -- Lock the user's pantry rows during the final availability check and deduction.
  FOR item IN (
    SELECT ri.ingredient_id, ri.quantity_required, ri.unit, i.name
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
    WHERE ri.recipe_id = p_recipe_id
  ) LOOP
    SELECT NVL(SUM(pi.quantity), 0)
      INTO l_stock
      FROM pantry_items pi
     WHERE pi.user_id = p_user_id
       AND pi.ingredient_id = item.ingredient_id
       AND pi.unit = item.unit
     FOR UPDATE;
    IF l_stock < item.quantity_required THEN
      RAISE_APPLICATION_ERROR(-20002, 'Insufficient pantry stock for ' || item.name);
    END IF;
  END LOOP;

  FOR item IN (
    SELECT ri.ingredient_id, ri.quantity_required, ri.unit
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = p_recipe_id
  ) LOOP
    l_remaining := item.quantity_required;
    FOR stock IN (
      SELECT item_id, quantity
      FROM pantry_items
      WHERE user_id = p_user_id
        AND ingredient_id = item.ingredient_id
        AND unit = item.unit
      ORDER BY expiry_date NULLS LAST, item_id
      FOR UPDATE
    ) LOOP
      EXIT WHEN l_remaining <= 0;
      l_deduction := LEAST(stock.quantity, l_remaining);
      IF stock.quantity - l_deduction <= 0 THEN
        DELETE FROM pantry_items WHERE item_id = stock.item_id;
      ELSE
        UPDATE pantry_items
           SET quantity = quantity - l_deduction
         WHERE item_id = stock.item_id;
      END IF;
      l_remaining := l_remaining - l_deduction;
    END LOOP;
  END LOOP;

  INSERT INTO cooking_log(user_id, recipe_id) VALUES (p_user_id, p_recipe_id);
  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/

CREATE OR REPLACE PROCEDURE process_expired_pantry(
  p_user_id IN NUMBER,
  p_as_of IN DATE DEFAULT SYSDATE
)
IS
BEGIN
  INSERT INTO waste_log(user_id, ingredient_id, quantity_wasted, unit, expired_on)
  SELECT user_id, ingredient_id, quantity, unit, expiry_date
    FROM pantry_items
   WHERE user_id = p_user_id
     AND expiry_date <= p_as_of;

  DELETE FROM pantry_items
   WHERE user_id = p_user_id
     AND expiry_date <= p_as_of;
  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/
