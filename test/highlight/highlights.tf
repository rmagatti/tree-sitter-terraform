module "module_name" {
# <- keyword
#       ^ definition
  attribute = "value"
  # <- definition.parameter
  #         ^ operator
  #           ^ string
  another_attribute = var.value
  # <-definition.parameter 
  #         ^ operator
  #           ^ definition.var
}

resource "resource_type" "resource_name" {
# <- keyword
#         ^ definition.type
#                         ^ definition.var
}
